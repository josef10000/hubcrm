import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, updateDoc, setDoc, collection, getDocs, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useArenaStore } from '@store/useArenaStore';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ReadingClubsPanelProps {
  userUid: string;
  orgId: string | undefined;
}

interface ReadingClub {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
  department: string;
  targetPages: number;
  participants: string[];
  progress: Record<string, number>; // [uid]: currentPage
  metaCompleted: boolean;
  deadline: number;
  isDemo?: boolean;
}

// Configurações visuais dos departamentos
const DEPARTMENTS_CONFIG: Record<string, {
  color: string;
  glowClass: string;
  bgGradient: string;
  textColor: string;
  lightColor: string;
}> = {
  'Desenvolvimento': {
    color: '#06b6d4', // Cyan
    glowClass: 'shadow-[0_0_20px_rgba(6,182,212,0.6)] border-cyan-500/30',
    bgGradient: 'from-cyan-500/20 to-blue-500/10',
    textColor: 'text-cyan-400',
    lightColor: 'rgba(6, 182, 212, 0.2)'
  },
  'Vendas': {
    color: '#10b981', // Emerald
    glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.6)] border-emerald-500/30',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    textColor: 'text-emerald-400',
    lightColor: 'rgba(16, 185, 129, 0.2)'
  },
  'Suporte': {
    color: '#f59e0b', // Amber
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.6)] border-amber-500/30',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    textColor: 'text-amber-400',
    lightColor: 'rgba(245, 158, 11, 0.2)'
  },
  'Recursos Humanos': {
    color: '#8b5cf6', // Violet
    glowClass: 'shadow-[0_0_20px_rgba(139,92,246,0.6)] border-violet-500/30',
    bgGradient: 'from-violet-500/20 to-purple-500/10',
    textColor: 'text-violet-400',
    lightColor: 'rgba(139, 92, 246, 0.2)'
  },
  'Marketing': {
    color: '#ec4899', // Pink
    glowClass: 'shadow-[0_0_20px_rgba(236,72,153,0.6)] border-pink-500/30',
    bgGradient: 'from-pink-500/20 to-rose-500/10',
    textColor: 'text-pink-400',
    lightColor: 'rgba(236, 72, 153, 0.2)'
  },
  'Geral': {
    color: '#6366f1', // Indigo
    glowClass: 'shadow-[0_0_20px_rgba(99,102,241,0.6)] border-indigo-500/30',
    bgGradient: 'from-indigo-500/20 to-purple-500/10',
    textColor: 'text-indigo-400',
    lightColor: 'rgba(99, 102, 241, 0.2)'
  }
};

const DEFAULT_DEPT = 'Desenvolvimento';

export const ReadingClubsPanel: React.FC<ReadingClubsPanelProps> = ({ userUid, orgId }) => {
  const { userProfile } = useAuth();
  const { teamProfiles } = useCRM();
  
  const [clubs, setClubs] = useState<ReadingClub[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(DEFAULT_DEPT);
  const [userDept, setUserDept] = useState<string>(DEFAULT_DEPT);
  const [loading, setLoading] = useState(true);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [newProgressPage, setNewProgressPage] = useState<number>(0);

  // Estados locais para Criação e Edição de Clubes
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bookTitle: '',
    bookAuthor: '',
    bookCoverUrl: '',
    department: 'Desenvolvimento',
    targetPages: 200,
    deadlineDays: 30
  });

  // Zustand Actions
  const addArenaCredits = useArenaStore(state => state.addArenaCredits);

  // Efeito para sincronizar e inferir departamento do usuário
  useEffect(() => {
    if (userProfile?.department) {
      setUserDept(userProfile.department);
      setSelectedDept(userProfile.department);
    }
  }, [userProfile]);

  // Sons procedurais Retro Chiptune
  const playRetroSound = (type: 'success' | 'click' | 'powerup') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'powerup') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch (e) {
      console.warn('Web Audio Context bloqueado ou não suportado.');
    }
  };

  // Inicialização e Escuta em Tempo Real do Firestore
  useEffect(() => {
    if (!orgId) return;

    const clubsColRef = collection(db, 'organizations', orgId, 'readingClubs');
    
    const unsubscribe = onSnapshot(clubsColRef, async (snapshot) => {
      if (snapshot.empty) {
        setClubs([]);
        setLoading(false);
      } else {
        const loadedClubs = snapshot.docs
          .map(doc => ({
            ...doc.data(),
            id: doc.id
          } as ReadingClub))
          .filter(c => !c.isDemo);

        // Remove de forma proativa mocks físicos no Firestore
        snapshot.docs.forEach(async (docSnapshot) => {
          const data = docSnapshot.data();
          if (data.isDemo) {
            try {
              await deleteDoc(docSnapshot.ref);
            } catch (err) {
              console.warn('[Clube de Leitura] Falha ao expurgar mock no Firestore:', err);
            }
          }
        });

        setClubs(loadedClubs);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [orgId, teamProfiles]);

  // Função para popular dados iniciais do clube
  const initializeMockClubs = async () => {
    if (!orgId) return;

    const mockClubsData: Omit<ReadingClub, 'id'>[] = [
      {
        bookId: 'clean_code_nexus',
        bookTitle: 'Clean Code: Habilidades Práticas do Software Agile',
        bookAuthor: 'Robert C. Martin',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/41xShTxONmL._SX377_BO1,204,203,200_.jpg',
        department: 'Desenvolvimento',
        targetPages: 430,
        participants: [],
        progress: {},
        metaCompleted: false,
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 dias
      },
      {
        bookId: 'influencia_persuasao_nexus',
        bookTitle: 'Armas da Persuasão: Como Influenciar e não se deixar influenciar',
        bookAuthor: 'Robert B. Cialdini',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/414v7c-cQfL._SX331_BO1,204,203,200_.jpg',
        department: 'Vendas',
        targetPages: 320,
        participants: [],
        progress: {},
        metaCompleted: true, // Já batido para permitir resgate de demonstração
        deadline: Date.now() + 15 * 24 * 60 * 60 * 1000
      },
      {
        bookId: 'satisfacao_garantida_nexus',
        bookTitle: 'Satisfação Garantida: No Caminho da Felicidade',
        bookAuthor: 'Tony Hsieh',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/41-l8lC3wNL._SX345_BO1,204,203,200_.jpg',
        department: 'Suporte',
        targetPages: 310,
        participants: [],
        progress: {},
        metaCompleted: false,
        deadline: Date.now() + 20 * 24 * 60 * 60 * 1000
      },
      {
        bookId: 'rapido_devagar_nexus',
        bookTitle: 'Rápido e Devagar: Duas Formas de Pensar',
        bookAuthor: 'Daniel Kahneman',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/41T-mX0R-EL._SX339_BO1,204,203,200_.jpg',
        department: 'Recursos Humanos',
        targetPages: 600,
        participants: [],
        progress: {},
        metaCompleted: false,
        deadline: Date.now() + 25 * 24 * 60 * 60 * 1000
      },
      {
        bookId: 'contagio_nexus',
        bookTitle: 'Contágio: Por que as Coisas Pegam',
        bookAuthor: 'Jonah Berger',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/4118sC9VpCL._SX331_BO1,204,203,200_.jpg',
        department: 'Marketing',
        targetPages: 280,
        participants: [],
        progress: {},
        metaCompleted: false,
        deadline: Date.now() + 28 * 24 * 60 * 60 * 1000
      },
      {
        bookId: 'trabalho_focado_nexus',
        bookTitle: 'Trabalho Focado: Como ter Sucesso em um Mundo Distraído',
        bookAuthor: 'Cal Newport',
        bookCoverUrl: 'https://images-na.ssl-images-amazon.com/images/I/41c-D1jO4UL._SX337_BO1,204,203,200_.jpg',
        department: 'Geral',
        targetPages: 250,
        participants: [],
        progress: {},
        metaCompleted: false,
        deadline: Date.now() + 10 * 24 * 60 * 60 * 1000
      }
    ];

    try {
      for (const rawClub of mockClubsData) {
        // Agrupar os membros da organização por departamento para popular o progresso inicial
        const deptMembers = teamProfiles.filter(p => (p.department || 'Geral') === rawClub.department);
        const participants = deptMembers.map(m => m.uid);
        const progress: Record<string, number> = {};

        // Injetar progresso inicial mockado
        deptMembers.forEach((m, idx) => {
          let currentPage = 0;
          if (rawClub.metaCompleted) {
            currentPage = rawClub.targetPages;
          } else {
            // Gerar páginas aleatórias de acordo com a ordem do membro
            currentPage = Math.min(
              rawClub.targetPages,
              Math.round((0.2 + (idx * 0.25) + Math.random() * 0.15) * rawClub.targetPages)
            );
          }
          progress[m.uid] = currentPage;
        });

        // Adicionar o próprio usuário no seu departamento correspondente
        if (rawClub.department === userDept && !progress[userUid]) {
          participants.push(userUid);
          progress[userUid] = rawClub.metaCompleted ? rawClub.targetPages : Math.round(rawClub.targetPages * 0.35);
        }

        const clubDocRef = doc(db, 'organizations', orgId, 'readingClubs', `${orgId}_${rawClub.department.toLowerCase()}_2026_05`);
        
        await setDoc(clubDocRef, {
          ...rawClub,
          participants,
          progress,
          isDemo: true
        });
      }
    } catch (e) {
      console.error('Erro ao popular clubes de leitura iniciais:', e);
    }
  };

  // Calcula o progresso do departamento individual
  const calculateClubStats = (club: ReadingClub) => {
    const totalTarget = club.targetPages * Math.max(1, club.participants.length);
    const currentRead = Object.values(club.progress).reduce((acc, p) => acc + p, 0);
    const rawProgress = totalTarget > 0 ? (currentRead / totalTarget) * 100 : 0;
    
    // Se o progresso ultrapassar 99.9%, fixa em 100%
    const progress = Math.min(100, Math.round(rawProgress));
    return { progress, totalTarget, currentRead };
  };

  const getActiveClub = () => {
    return clubs.find(c => c.department === selectedDept);
  };

  // Ação de Reivindicar Prêmio de Coins (+200 coins)
  const handleClaimReward = async (club: ReadingClub) => {
    playRetroSound('powerup');
    
    const userClaimedClubs = userProfile?.claimedReadingClubs || [];
    if (userClaimedClubs.includes(club.bookId)) {
      toast.info('Você já reivindicou o prêmio deste clube de leitura!');
      return;
    }

    try {
      // 1. Adicionar os créditos no Firestore
      await addArenaCredits(userUid, 200);

      // 2. Registrar a reivindicação no perfil do usuário
      const profileRef = doc(db, 'profiles', userUid);
      await updateDoc(profileRef, {
        claimedReadingClubs: arrayUnion(club.bookId)
      });

      // 3. Estouro de confetti neon com arpejo
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
      });

      setTimeout(() => playRetroSound('success'), 200);
      toast.success('🏆 Parabéns! +200 Fliperama Coins adicionadas ao seu saldo!');
    } catch (e) {
      toast.error('Erro ao resgatar moedas. Tente novamente.');
      console.error(e);
    }
  };

  // Ação para o usuário atualizar sua leitura
  const handleUpdateUserProgress = async () => {
    const club = clubs.find(c => c.department === userDept);
    if (!club || !orgId) return;

    if (newProgressPage < 0 || newProgressPage > club.targetPages) {
      toast.error(`Página inválida. Digite um valor entre 0 e ${club.targetPages}.`);
      return;
    }

    playRetroSound('click');

    try {
      const clubDocRef = doc(db, 'organizations', orgId, 'readingClubs', club.id);
      
      const newProgressMap = {
        ...club.progress,
        [userUid]: newProgressPage
      };

      // Recalcular se a meta de 100% foi atingida por todos
      const totalTarget = club.targetPages * Math.max(1, club.participants.length);
      const currentRead = Object.values(newProgressMap).reduce((acc, p) => acc + p, 0);
      const metaCompleted = currentRead >= totalTarget;

      await updateDoc(clubDocRef, {
        progress: newProgressMap,
        metaCompleted
      });

      setIsUpdatingProgress(false);
      toast.success('Seu progresso de leitura foi sincronizado!');
      
      // Se bateu 100%, faz festa
      if (metaCompleted) {
        confetti({ particleCount: 100, spread: 60 });
        playRetroSound('success');
      }
    } catch (e) {
      toast.error('Erro ao atualizar progresso de leitura.');
      console.error(e);
    }
  };

  // Modal rápido de atualização
  const openProgressModal = (club: ReadingClub) => {
    playRetroSound('click');
    const userCurrent = club.progress[userUid] || 0;
    setNewProgressPage(userCurrent);
    setIsUpdatingProgress(true);
  };

  // CRUD handlers para Clubes de Leitura
  const handleOpenCreateModal = () => {
    playRetroSound('click');
    setFormData({
      bookTitle: '',
      bookAuthor: '',
      bookCoverUrl: '',
      department: selectedDept || 'Desenvolvimento',
      targetPages: 200,
      deadlineDays: 30
    });
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (club: ReadingClub) => {
    playRetroSound('click');
    setFormData({
      bookTitle: club.bookTitle,
      bookAuthor: club.bookAuthor,
      bookCoverUrl: club.bookCoverUrl || '',
      department: club.department,
      targetPages: club.targetPages,
      deadlineDays: 30
    });
    setEditingClubId(club.id);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleSaveClub = async () => {
    if (!orgId) return;

    if (!formData.bookTitle.trim() || !formData.bookAuthor.trim()) {
      toast.error('Título e autor do livro são obrigatórios!');
      return;
    }

    if (formData.targetPages <= 0) {
      toast.error('O total de páginas deve ser maior que zero!');
      return;
    }

    playRetroSound('click');
    try {
      if (formMode === 'create') {
        const clubId = `${orgId}_${Date.now()}`;
        const bookId = `custom_book_${Date.now()}`;
        
        // Agrupar membros e criar progresso
        const deptMembers = teamProfiles.filter(p => (p.department || 'Geral') === formData.department);
        const participants = deptMembers.map(m => m.uid);
        if (!participants.includes(userUid) && formData.department === userDept) {
          participants.push(userUid);
        }

        const progress: Record<string, number> = {};
        participants.forEach(uid => {
          progress[uid] = 0;
        });

        const newClub: ReadingClub = {
          id: clubId,
          bookId,
          bookTitle: formData.bookTitle.trim(),
          bookAuthor: formData.bookAuthor.trim(),
          bookCoverUrl: formData.bookCoverUrl.trim() || undefined,
          department: formData.department,
          targetPages: formData.targetPages,
          participants,
          progress,
          metaCompleted: false,
          deadline: Date.now() + formData.deadlineDays * 24 * 60 * 60 * 1000,
          isDemo: false
        };

        await setDoc(doc(db, 'organizations', orgId, 'readingClubs', clubId), newClub);
        setSelectedDept(formData.department); // Seleciona o departamento do novo clube
        toast.success('📖 Novo clube de leitura criado com sucesso!');
      } else {
        if (!editingClubId) return;
        const clubDocRef = doc(db, 'organizations', orgId, 'readingClubs', editingClubId);
        
        await updateDoc(clubDocRef, {
          bookTitle: formData.bookTitle.trim(),
          bookAuthor: formData.bookAuthor.trim(),
          bookCoverUrl: formData.bookCoverUrl.trim() || null,
          department: formData.department,
          targetPages: formData.targetPages,
          deadline: Date.now() + formData.deadlineDays * 24 * 60 * 60 * 1000
        });
        toast.success('📖 Clube de leitura atualizado!');
      }

      setIsFormOpen(false);
    } catch (e) {
      toast.error('Erro ao salvar clube de leitura.');
      console.error(e);
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!orgId) return;

    const ok = await window.confirm('Deseja realmente excluir este clube de leitura permanentemente? Isso apagará todo o histórico de progresso do time.');
    if (!ok) return;

    playRetroSound('click');
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'readingClubs', clubId));
      toast.success('🗑️ Clube de leitura excluído.');
      
      // Mudar a aba para outro clube existente
      const remaining = clubs.filter(c => c.id !== clubId);
      if (remaining.length > 0) {
        setSelectedDept(remaining[0].department);
      }
    } catch (e) {
      toast.error('Erro ao excluir clube de leitura.');
      console.error(e);
    }
  };

  if (loading && clubs.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Conectando Clubes...</span>
      </div>
    );
  }

  // Estado Vazio Premium se não houver nenhum clube de leitura real criado
  if (!loading && clubs.length === 0) {
    return (
      <div className="space-y-12 select-none animate-in fade-in duration-300">
        {/* HEADER DE INTRODUÇÃO DA DINÂMICA */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0d0f16]/80 border border-white/10 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl text-center md:text-left">
              <span className="px-3 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                Nexus Hub & Arena Synergy
              </span>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                Clubes de Leitura Nexus Coletivos
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Una-se ao seu departamento e devore livros técnicos! Cada time tem uma meta acumulada de leitura no livro do mês. Ao bater 100%, todos ganham <span className="text-amber-400">200 Fliperama Coins 🪙</span> para gastar na Arena!
              </p>
            </div>
            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                🪙
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Seu Saldo</p>
                <h3 className="text-2xl font-black text-white">{userProfile?.arenaCredits || 0} <span className="text-xs font-bold text-gray-500">Coins</span></h3>
              </div>
            </div>
          </div>
        </div>

        {/* CONTAINER DO EMPTY STATE NEON */}
        <div className="relative overflow-hidden rounded-[3rem] bg-[#0d0f16]/90 border border-white/5 p-12 text-center flex flex-col items-center gap-6 shadow-2xl max-w-3xl mx-auto border-dashed">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.01)_0%,rgba(6,182,212,0.02)_50%,rgba(255,255,255,0.01)_100%)] pointer-events-none" />
          <div className="w-20 h-20 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-pulse">
            📚
          </div>
          <div className="space-y-3 max-w-md">
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Nenhum Clube de Leitura Criado</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Não existem metas coletivas de leitura ativas na organização. Seja o pioneiro e crie a primeira meta do seu departamento hoje mesmo!
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-8 py-4 bg-primary-500 hover:bg-primary-400 hover:scale-105 active:scale-95 transition-all rounded-3xl text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-2xl shadow-primary-500/20 cursor-pointer"
          >
            <i className="ph-bold ph-plus" />
            Criar Primeiro Clube
          </button>
        </div>

        {/* MODAL DE FORMULÁRIO DE CADASTRO/EDIÇÃO */}
        <AnimatePresence>
          {isFormOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFormOpen(false)}
                className="fixed inset-0 bg-black z-[100] backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0d0f16] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 z-[101] overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-[40px] rounded-full pointer-events-none" />

                <div className="space-y-6">
                  <div>
                    <span className="px-3 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {formMode === 'create' ? 'NOVO CLUBE' : 'EDITAR CLUBE'}
                    </span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mt-3">
                      {formMode === 'create' ? 'Criar Clube de Leitura' : 'Editar Clube de Leitura'}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-1">
                      Configure a obra oficial e a meta de leitura coletiva para o departamento selecionado.
                    </p>
                  </div>

                  {/* Campos do Formulário */}
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Título do Livro</label>
                      <input
                        type="text"
                        value={formData.bookTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookTitle: e.target.value }))}
                        placeholder="Ex: Trabalho Focado"
                        className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Autor</label>
                      <input
                        type="text"
                        value={formData.bookAuthor}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookAuthor: e.target.value }))}
                        placeholder="Ex: Cal Newport"
                        className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Link da Imagem de Capa (URL)</label>
                      <input
                        type="text"
                        value={formData.bookCoverUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookCoverUrl: e.target.value }))}
                        placeholder="Ex: https://link-da-imagem.jpg (opcional)"
                        className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Departamento</label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                          disabled={formMode === 'edit'}
                          className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                        >
                          {Object.keys(DEPARTMENTS_CONFIG).map(dept => (
                            <option key={dept} value={dept} className="bg-[#0d0f16]">{dept}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Meta de Páginas</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.targetPages}
                          onChange={(e) => setFormData(prev => ({ ...prev, targetPages: parseInt(e.target.value) || 0 }))}
                          placeholder="Ex: 300"
                          className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all border border-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveClub}
                      className="py-4 bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:scale-105 transition-all"
                    >
                      Salvar Clube
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const activeClub = getActiveClub();
  const userHasClaimed = activeClub ? (userProfile?.claimedReadingClubs || []).includes(activeClub.bookId) : false;

  return (
    <div className="space-y-12">
      {/* HEADER DE INTRODUÇÃO DA DINÂMICA */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0d0f16]/80 border border-white/10 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <span className="px-3 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full text-[9px] font-black uppercase tracking-widest">
              Nexus Hub & Arena Synergy
            </span>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              Clubes de Leitura Nexus Coletivos
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Una-se ao seu departamento e devore livros técnicos! Cada time tem uma meta acumulada de leitura no livro do mês. Ao bater 100%, todos ganham <span className="text-amber-400">200 Fliperama Coins 🪙</span> para gastar na Arena!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto px-6 py-4 bg-primary-500 hover:bg-primary-400 hover:scale-105 active:scale-95 transition-all rounded-3xl text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20"
            >
              <i className="ph-bold ph-plus" />
              Criar Clube
            </button>
            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                🪙
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Seu Saldo</p>
                <h3 className="text-2xl font-black text-white">{userProfile?.arenaCredits || 0} <span className="text-xs font-bold text-gray-500">Coins</span></h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRADE PRINCIPAL: TERMÔMETROS NEON 3D E FOCO DO CLUBE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA (4 COLS): PAINEL DOS TERMÔMETROS VERTICAIS NEON */}
        <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 rounded-[3rem] p-6 space-y-8 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-1">
              Termômetros Corporativos
            </h3>
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-6">
              Média acumulada de páginas lidas por time
            </p>

            {/* AREA DE RENDERIZAÇÃO DOS TERMÔMETROS 3D GLASSMORPHISM */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-6">
              {clubs.map(club => {
                const config = DEPARTMENTS_CONFIG[club.department] || DEPARTMENTS_CONFIG['Geral'];
                const stats = calculateClubStats(club);
                const isSelected = selectedDept === club.department;
                const isUserDept = userDept === club.department;

                return (
                  <motion.div
                    key={club.id}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => { playRetroSound('click'); setSelectedDept(club.department); }}
                    className={`relative p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-between text-center min-h-[220px] ${
                      isSelected 
                        ? `bg-white/[0.04] ${config.glowClass}` 
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Indicador de "Seu Departamento" */}
                    {isUserDept && (
                      <span className="absolute -top-2 px-2 py-0.5 bg-primary-500 text-white rounded-full text-[7px] font-black uppercase tracking-widest scale-90">
                        Meu Time
                      </span>
                    )}

                    {/* Nome do Departamento */}
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest truncate max-w-full">
                      {club.department}
                    </span>

                    {/* O TERMÔMETRO FISICO 3D */}
                    <div className="relative w-7 h-28 bg-[#151722]/60 rounded-full border border-white/10 p-0.5 overflow-hidden flex flex-col justify-end shadow-inner">
                      {/* Efeito de Reflexo no Vidro do Termômetro */}
                      <div className="absolute inset-y-0 left-1 w-px bg-white/20 z-20 rounded-full pointer-events-none" />
                      
                      {/* Fluido Neon Interno */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${stats.progress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="w-full rounded-full relative"
                        style={{
                          background: `linear-gradient(to top, ${config.color}, ${config.color}dd)`,
                          boxShadow: `0 0 15px ${config.color}cc, inset 0 2px 5px rgba(255,255,255,0.4)`
                        }}
                      >
                        {/* Brilho neon de topo */}
                        <div className="absolute -top-1 inset-x-0 h-2 bg-white rounded-full blur-[2px] opacity-80" />
                      </motion.div>
                    </div>

                    {/* Valor Percentual */}
                    <div>
                      <h4 className={`text-base font-black ${config.textColor} tracking-tight`}>
                        {stats.progress}%
                      </h4>
                      <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mt-0.5">
                        {stats.progress === 100 ? 'CONCLUÍDO' : 'LENDO'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
            <i className="ph-fill ph-info text-amber-500 text-lg" />
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
              Dica: Para progredir no termômetro do seu time, atualize o progresso de suas leituras pelo botão "Registrar Minha Leitura" no painel à direita!
            </p>
          </div>
        </div>

        {/* COLUNA DIREITA (7 COLS): FOCO DO DEPARTAMENTO SELECIONADO */}
        <div className="lg:col-span-7 space-y-8">
          {activeClub ? (() => {
            const config = DEPARTMENTS_CONFIG[activeClub.department] || DEPARTMENTS_CONFIG['Geral'];
            const stats = calculateClubStats(activeClub);
            const isUserClub = activeClub.department === userDept;

            return (
              <div className="space-y-8">
                {/* CARTÃO DE FOCO PRINCIPAL */}
                <div className="relative overflow-hidden rounded-[3rem] bg-[#0d0f16]/90 border border-white/10 p-8 shadow-2xl flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary-500/10 to-transparent blur-[80px] pointer-events-none" />

                  {/* Topo do Cartão */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest ${config.textColor}`}>
                          Time: {activeClub.department}
                        </span>
                        {!activeClub.isDemo && (
                          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            <button
                              onClick={() => handleOpenEditModal(activeClub)}
                              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all"
                              title="Editar Clube de Leitura"
                            >
                              <i className="ph-bold ph-pencil-simple text-[10px]" />
                            </button>
                            <div className="w-px h-3 bg-white/10" />
                            <button
                              onClick={() => handleDeleteClub(activeClub.id)}
                              className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400 transition-all"
                              title="Excluir Clube de Leitura"
                            >
                              <i className="ph-bold ph-trash text-[10px]" />
                            </button>
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-3">
                        Leitura Oficial do Mês
                      </h3>
                    </div>

                    {/* Meta Coletiva */}
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Progresso Acumulado</p>
                      <h4 className={`text-4xl font-black ${config.textColor} mt-1 flex items-baseline gap-1`}>
                        {stats.progress}%
                        <span className="text-xs text-gray-500 font-bold uppercase">concluído</span>
                      </h4>
                    </div>
                  </div>

                  {/* Informações do Livro com Capa */}
                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/[0.02] border border-white/5 p-5 rounded-3xl mb-8">
                    {/* Capa do Livro */}
                    <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                      {activeClub.bookCoverUrl ? (
                        <img src={activeClub.bookCoverUrl} alt={activeClub.bookTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-950 to-primary-800 flex items-center justify-center">
                          <i className="ph-duotone ph-book text-3xl text-white/30" />
                        </div>
                      )}
                    </div>

                    {/* Detalhes do Livro */}
                    <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
                      <h4 className="text-base font-black text-white uppercase tracking-wide truncate">
                        {activeClub.bookTitle}
                      </h4>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Por {activeClub.bookAuthor}
                      </p>
                      <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start pt-2">
                        <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                          <i className="ph-bold ph-book-open" /> {activeClub.targetPages} Páginas
                        </span>
                        <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5">
                          <i className="ph-bold ph-users-three" /> {activeClub.participants.length} Leitores
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Horizontal Neon */}
                  <div className="space-y-2 mb-8">
                    <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      <span>Início</span>
                      <span>{stats.currentRead} / {stats.totalTarget} páginas lidas</span>
                      <span>Meta Batida</span>
                    </div>
                    <div className="h-4 w-full bg-[#151722]/60 rounded-full border border-white/10 p-0.5 overflow-hidden flex shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(to right, ${config.color}, ${config.color}dd)`,
                          boxShadow: `0 0 15px ${config.color}aa, inset 0 1px 2px rgba(255,255,255,0.4)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Botões e Seção do Usuário Logado */}
                  <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                    {isUserClub ? (
                      <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="text-left">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Seu Progresso Pessoal</p>
                          <h4 className="text-lg font-black text-white mt-1">
                            Página {activeClub.progress[userUid] || 0} <span className="text-xs text-gray-600 font-bold uppercase">de {activeClub.targetPages} ({Math.min(100, Math.round(((activeClub.progress[userUid] || 0) / activeClub.targetPages) * 100))}% lido)</span>
                          </h4>
                        </div>
                        <button
                          onClick={() => openProgressModal(activeClub)}
                          className={`w-full sm:w-auto px-6 py-3.5 bg-primary-500 hover:scale-105 transition-all text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20`}
                        >
                          <i className="ph-bold ph-pencil-simple" />
                          Registrar Minha Leitura
                        </button>
                      </div>
                    ) : (
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic text-center w-full">
                        Você está visualizando a estante do time {activeClub.department}. Selecione o seu time ({userDept}) para registrar leituras.
                      </p>
                    )}
                  </div>
                </div>

                {/* PAINEL DE PREMIAÇÃO (EXIBIDO APENAS SE FOR 100% E FOR O TIME DO COLABORADOR LOGADO) */}
                <AnimatePresence>
                  {stats.progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/30 p-8 text-center space-y-6 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center"
                    >
                      {/* Efeito Arco-íris / Glitter */}
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.01)_0%,rgba(245,158,11,0.02)_50%,rgba(255,255,255,0.01)_100%)] animate-pulse pointer-events-none" />

                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-500/20">
                        🏆
                      </div>
                      <div className="space-y-2 max-w-xl">
                        <h4 className="text-xl font-black text-amber-400 uppercase tracking-tight">
                          {isUserClub ? 'Seu Time Bateu a Meta Coletiva! 🎉' : `O Time ${activeClub.department} Bateu a Meta Coletiva! 🏆`}
                        </h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                          {isUserClub
                            ? 'Parabéns a todos os leitores do time por manterem o foco técnico! Reivindique sua bonificação especial de Fliperama Coins na carteira agora mesmo.'
                            : 'O time de leitores do departamento atingiu 100% de leitura acumulada no livro oficial do mês!'}
                        </p>
                      </div>

                      {isUserClub && (
                        <button
                          onClick={() => handleClaimReward(activeClub)}
                          disabled={userHasClaimed}
                          className={`px-8 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl relative ${
                            userHasClaimed
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500/60 cursor-default'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-[#0d0f16] shadow-amber-500/20 hover:scale-105 active:scale-95 animate-pulse'
                          }`}
                        >
                          {userHasClaimed ? (
                            <span className="flex items-center gap-2">
                              <i className="ph-bold ph-check-circle text-base" />
                              Prêmio Reivindicado 🌟
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <i className="ph-fill ph-gift text-base" />
                              Reivindicar Coins (+200 🪙)
                            </span>
                          )}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* DETALHAMENTO DE QUEM ESTÁ LENDO (Membros da equipe) */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                    Quem está Lendo no Time
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamProfiles
                      .filter(m => (m.department || 'Geral') === activeClub.department || (m.uid === userUid && activeClub.department === userDept))
                      // Evitar duplicidade do usuário se ele estiver no teamProfiles
                      .filter((m, idx, self) => self.findIndex(t => t.uid === m.uid) === idx)
                      .map(member => {
                        const isSelf = member.uid === userUid;
                        const pagesRead = activeClub.progress[member.uid] || 0;
                        const progressPercent = Math.min(100, Math.round((pagesRead / activeClub.targetPages) * 100));

                        return (
                          <div
                            key={member.uid}
                            className={`p-4 bg-[#0d0f16]/60 border rounded-2xl flex items-center justify-between gap-4 ${
                              isSelf ? 'border-primary-500/30 bg-primary-500/5' : 'border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                {member.photoURL ? (
                                  <img src={member.photoURL} alt={member.displayName} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center font-bold text-white text-sm">
                                    {member.displayName.charAt(0)}
                                  </div>
                                )}
                                
                                {/* Frame Cosmético Neon */}
                                {member.avatarFrame && member.avatarFrame !== 'none' && (
                                  <div className={`absolute -inset-0.5 rounded-xl border border-dashed animate-pulse pointer-events-none ${
                                    member.avatarFrame === 'gold' ? 'border-amber-400' :
                                    member.avatarFrame === 'ruby' ? 'border-red-500' :
                                    member.avatarFrame === 'cyberpunk' ? 'border-cyan-400' :
                                    member.avatarFrame === 'rainbow' ? 'border-purple-400' : 'border-primary-400'
                                  }`} />
                                )}
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider truncate flex items-center gap-1.5">
                                  {member.displayName.split(' ')[0]}
                                  {isSelf && <span className="text-[7px] bg-primary-500 px-1 py-0.5 rounded text-white font-black">Você</span>}
                                </h4>
                                {member.activeTitle && (
                                  <p className="text-[8px] font-black text-primary-400 uppercase tracking-widest mt-0.5 truncate bg-primary-500/10 px-1 py-0.5 rounded w-fit">
                                    👑 {member.activeTitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <h4 className={`text-xs font-black ${progressPercent === 100 ? 'text-emerald-400' : 'text-gray-400'} uppercase tracking-widest`}>
                                {progressPercent === 100 ? 'Finalizou' : `Pág. ${pagesRead}`}
                              </h4>
                              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                                {progressPercent}% lido
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="py-24 text-center">
              <i className="ph-duotone ph-books text-6xl text-gray-500/20" />
              <h4 className="text-lg font-black text-white/40 uppercase tracking-widest mt-4">Nenhum Clube Selecionado</h4>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ATUALIZAÇÃO DO PROGRESSO DO USUÁRIO */}
      <AnimatePresence>
        {isUpdatingProgress && activeClub && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdatingProgress(false)}
              className="fixed inset-0 bg-black z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0d0f16] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 z-[101] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-[40px] rounded-full pointer-events-none" />

              <div className="space-y-6">
                <div>
                  <span className="px-3 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Time: {activeClub.department}
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mt-3">
                    Registrar Progresso
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-1">
                    Digite a sua página lida atual do livro oficial do mês para acumular pontos para a meta coletiva do seu time.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    {activeClub.bookCoverUrl ? (
                      <img src={activeClub.bookCoverUrl} alt={activeClub.bookTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center text-white/30"><i className="ph-duotone ph-book" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white uppercase tracking-wide truncate">{activeClub.bookTitle}</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 truncate">Por {activeClub.bookAuthor}</p>
                    <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mt-2">Alvo: {activeClub.targetPages} páginas</p>
                  </div>
                </div>

                {/* Input de Página */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
                    Página Atual
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={activeClub.targetPages}
                      value={newProgressPage}
                      onChange={(e) => setNewProgressPage(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#151722] border border-white/10 rounded-2xl px-6 py-4 text-white text-base font-black focus:border-primary-500 outline-none transition-all shadow-inner"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 uppercase tracking-widest">
                      / {activeClub.targetPages} págs.
                    </div>
                  </div>
                </div>

                {/* Botoes */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsUpdatingProgress(false)}
                    className="py-4.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateUserProgress}
                    className="py-4.5 bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:scale-105 transition-all"
                  >
                    Salvar Progresso
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0d0f16] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 z-[101] overflow-hidden animate-pulse-none"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-[40px] rounded-full pointer-events-none" />

              <div className="space-y-6">
                <div>
                  <span className="px-3 py-1 bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {formMode === 'create' ? 'NOVO CLUBE' : 'EDITAR CLUBE'}
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mt-3">
                    {formMode === 'create' ? 'Criar Clube de Leitura' : 'Editar Clube de Leitura'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-1">
                    Configure a obra oficial e a meta de leitura coletiva para o departamento selecionado.
                  </p>
                </div>

                {/* Campos do Formulário */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Título do Livro */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Título do Livro</label>
                    <input
                      type="text"
                      value={formData.bookTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, bookTitle: e.target.value }))}
                      placeholder="Ex: Trabalho Focado"
                      className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Autor */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Autor</label>
                    <input
                      type="text"
                      value={formData.bookAuthor}
                      onChange={(e) => setFormData(prev => ({ ...prev, bookAuthor: e.target.value }))}
                      placeholder="Ex: Cal Newport"
                      className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Link da Capa */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Link da Imagem de Capa (URL)</label>
                    <input
                      type="text"
                      value={formData.bookCoverUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, bookCoverUrl: e.target.value }))}
                      placeholder="Ex: https://link-da-imagem.jpg (opcional)"
                      className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Departamento */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Departamento</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        disabled={formMode === 'edit'} // Não permite mudar de departamento na edição
                        className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                      >
                        {Object.keys(DEPARTMENTS_CONFIG).map(dept => (
                          <option key={dept} value={dept} className="bg-[#0d0f16]">{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Total de Páginas */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Meta de Páginas</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.targetPages}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetPages: parseInt(e.target.value) || 0 }))}
                        placeholder="Ex: 300"
                        className="w-full bg-[#151722] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Botoes */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveClub}
                    className="py-4 bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 hover:scale-105 transition-all"
                  >
                    Salvar Clube
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
