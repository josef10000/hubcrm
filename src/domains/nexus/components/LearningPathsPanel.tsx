import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Trophy, Sparkles, Plus, CheckCircle, ArrowRight, Flame, ShieldAlert, Award, Trash2, Pencil } from 'lucide-react';
import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';
import { useNexusStore, NexusBook } from '@store/useNexusStore';
import { useArenaStore } from '@store/useArenaStore';
import { NEON_AURA_MAP } from './library/BookCard';

import { usePermissions } from '@auth/hooks/usePermissions';

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  benefit: string;
  neonColor: string; // ex: 'acid-lime' | 'cyberpunk-pink'
  bookIds: string[]; // IDs dos livros da comunidade associados
  hubCoinReward: number;
  createdAt: number;
  createdBy: string;
}

export interface UserPathProgress {
  pathId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'NOT_STARTED';
  startedAt: number;
  completedAt: number | null;
  completedBookIds: string[];
  progressPercentage: number;
  welcomeRewardClaimed?: boolean;
}

export function LearningPathsPanel() {
  const { userProfile, user } = useAuth();
  const { hasPermission } = usePermissions();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [userProgresses, setUserProgresses] = useState<Record<string, UserPathProgress>>({});
  const [communityBooks, setCommunityBooks] = useState<NexusBook[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados locais do Administrador (Criação/Edição de Trilhas)
  const [isCreating, setIsCreating] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [benefit, setBenefit] = useState('');
  const [neonColor, setNeonColor] = useState('acid-lime');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [hubCoinReward, setHubCoinReward] = useState(200);

  const orgId = userProfile?.orgId;
  const uid = user?.uid;
  const isAdmin = hasPermission('MANAGE_SETTINGS') || hasPermission('MANAGE_TEAM');

  // Limpa o formulário e fecha o modal
  const handleCloseModal = () => {
    setName('');
    setDescription('');
    setBenefit('');
    setSelectedBookIds([]);
    setNeonColor('acid-lime');
    setHubCoinReward(200);
    setIsCreating(false);
    setEditingPath(null);
  };

  // Carrega os dados da trilha para o modal de edição
  const handleOpenEdit = (path: LearningPath) => {
    setEditingPath(path);
    setName(path.name);
    setDescription(path.description);
    setBenefit(path.benefit);
    setSelectedBookIds(path.bookIds);
    setNeonColor(path.neonColor);
    setHubCoinReward(path.hubCoinReward);
    setIsCreating(true);
  };

  // Carrega as trilhas e o progresso do usuário logado
  useEffect(() => {
    if (!orgId || !uid) return;

    // 1. Escuta as Trilhas da Organização
    const pathsCol = collection(db, 'organizations', orgId, 'learningPaths');
    const qPaths = query(pathsCol, orderBy('createdAt', 'desc'));
    const unsubPaths = onSnapshot(qPaths, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningPath));
      setPaths(list);
      setLoading(false);
    });

    // 2. Escuta o progresso do usuário logado
    const progressCol = collection(db, 'organizations', orgId, 'users', uid, 'learningPaths');
    const unsubProgress = onSnapshot(progressCol, (snap) => {
      const map: Record<string, UserPathProgress> = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data() as UserPathProgress;
      });
      setUserProgresses(map);
    });

    // 3. Carrega os livros da comunidade
    const comBooksCol = collection(db, 'organizations', orgId, 'communityBooks');
    const unsubComBooks = onSnapshot(comBooksCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as NexusBook));
      setCommunityBooks(list);
    });

    return () => {
      unsubPaths();
      unsubProgress();
      unsubComBooks();
    };
  }, [orgId, uid]);

  // Função para aceitar e iniciar uma trilha com bônus de aceite antifraude
  const handleStartPath = async (path: LearningPath) => {
    if (!uid || !orgId) return;

    const tId = toast.loading(`Iniciando missão "${path.name}"...`);
    try {
      // 1. Verifica se o progresso já existia e se o bônus de aceite já foi coletado
      const progressRef = doc(db, 'organizations', orgId, 'users', uid, 'learningPaths', path.id);
      const progressSnap = await getDoc(progressRef);
      const hasClaimedBefore = progressSnap.exists() ? !!progressSnap.data()?.welcomeRewardClaimed : false;

      let welcomeRewardClaimed = hasClaimedBefore;

      // Se for o primeiro aceite, concede o bônus de aceite (+50 HubCoins)
      if (!hasClaimedBefore) {
        try {
          await useArenaStore.getState().addArenaCredits(uid, 50);
          welcomeRewardClaimed = true;
          toast.success(`🎉 BÔNUS DE ACEITE: Você ganhou +50 HubCoins de boas-vindas à missão! 🪙`, { duration: 6000 });
        } catch (coinErr) {
          console.error('Erro ao conceder bônus de aceite:', coinErr);
        }
      }

      // 2. Cria ou reescreve o registro de progresso com status ACTIVE
      const initialProgress: UserPathProgress = {
        pathId: path.id,
        userId: uid,
        status: 'ACTIVE',
        startedAt: Date.now(),
        completedAt: null,
        completedBookIds: [],
        progressPercentage: 0,
        welcomeRewardClaimed
      };
      await setDoc(progressRef, initialProgress);

      // 3. Busca e clona os livros da trilha para a biblioteca pessoal do colaborador
      const booksCol = collection(db, 'organizations', orgId, 'communityBooks');
      const booksSnap = await getDocs(booksCol);
      const communityBooksMap = booksSnap.docs.map(d => ({ id: d.id, ...d.data() } as NexusBook));
      
      const booksToClone = communityBooksMap.filter(b => path.bookIds.includes(b.id));

      // Atualiza a biblioteca particular do usuário na store / Firebase
      const currentBooks = [...useNexusStore.getState().books];
      let hasUpdates = false;

      const updatedBooks = [...currentBooks];

      for (const comBook of booksToClone) {
        // Verifica se o livro já existe na estante dele (por originalBookId ou título semelhante)
        const existingIdx = updatedBooks.findIndex(b => b.originalBookId === comBook.id || b.title.toLowerCase().trim() === comBook.title.toLowerCase().trim());
        
        if (existingIdx !== -1) {
          // Atualiza para incluir os campos da trilha, aura neon e zera progresso/maxPageRead se ele estiver reiniciando do zero
          updatedBooks[existingIdx] = {
            ...updatedBooks[existingIdx],
            learningPathId: path.id,
            neonColor: path.neonColor,
            currentPage: 0,
            maxPageRead: 0 // Permite ganhar moedas novamente ao ler do zero de forma justa
          };
          hasUpdates = true;
        } else {
          // Caso não exista na biblioteca particular, clona o livro com neon
          const clonedBook: NexusBook = {
            ...comBook,
            id: `path_${path.id}_${comBook.id}_${Date.now()}`,
            originalBookId: comBook.id,
            addedAt: Date.now(),
            currentPage: 0,
            maxPageRead: 0,
            status: 'want_to_read',
            learningPathId: path.id,
            neonColor: path.neonColor,
            isCommunity: false
          };
          updatedBooks.push(clonedBook);
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        // Salva na estante particular (Firestore e Zustand local)
        const profileRef = doc(db, 'profiles', uid);
        await updateDoc(profileRef, {
          'nexusData.books': updatedBooks
        });
        useNexusStore.getState().setBooks(updatedBooks);
      }

      toast.success(`Missão Iniciada! Os livros foram adicionados à sua biblioteca pessoal com fundo neon! 🌟`, { id: tId, duration: 6000 });
    } catch (err: any) {
      console.error('Erro ao iniciar trilha:', err);
      toast.error('Falha ao iniciar trilha corporativa.', { id: tId });
    }
  };

  // Função para pausar uma trilha (Cessa o brilho neon reativamente)
  const handlePausePath = async (path: LearningPath) => {
    if (!uid || !orgId) return;

    const tId = toast.loading(`Pausando missão "${path.name}"...`);
    try {
      // 1. Atualiza o status do progresso para PAUSED
      const progressRef = doc(db, 'organizations', orgId, 'users', uid, 'learningPaths', path.id);
      await updateDoc(progressRef, { status: 'PAUSED' });

      // 2. Remove temporariamente a aura neon dos livros vinculados na estante
      const currentBooks = [...useNexusStore.getState().books];
      const updatedBooks = currentBooks.map(b => {
        if (b.learningPathId === path.id) {
          return {
            ...b,
            neonColor: undefined // Cessar o neon reativamente
          };
        }
        return b;
      });

      const profileRef = doc(db, 'profiles', uid);
      await updateDoc(profileRef, {
        'nexusData.books': updatedBooks
      });
      useNexusStore.getState().setBooks(updatedBooks);

      toast.success(`Missão Pausada! A aura neon dos livros foi suspensa temporariamente na sua estante. ⏸️`, { id: tId, duration: 5000 });
    } catch (err) {
      console.error('Erro ao pausar trilha:', err);
      toast.error('Falha ao pausar trilha corporativa.', { id: tId });
    }
  };

  // Função para retomar uma trilha (Restabelece o brilho neon reativamente)
  const handleResumePath = async (path: LearningPath) => {
    if (!uid || !orgId) return;

    const tId = toast.loading(`Retomando missão "${path.name}"...`);
    try {
      // 1. Atualiza o status do progresso para ACTIVE
      const progressRef = doc(db, 'organizations', orgId, 'users', uid, 'learningPaths', path.id);
      await updateDoc(progressRef, { status: 'ACTIVE' });

      // 2. Restabelece o neon dos livros vinculados na estante
      const currentBooks = [...useNexusStore.getState().books];
      const updatedBooks = currentBooks.map(b => {
        if (b.learningPathId === path.id) {
          return {
            ...b,
            neonColor: path.neonColor // Volta a brilhar de forma premium
          };
        }
        return b;
      });

      const profileRef = doc(db, 'profiles', uid);
      await updateDoc(profileRef, {
        'nexusData.books': updatedBooks
      });
      useNexusStore.getState().setBooks(updatedBooks);

      toast.success(`Missão Retomada! Os livros na sua biblioteca voltaram a brilhar com aura neon! ⚡`, { id: tId, duration: 5000 });
    } catch (err) {
      console.error('Erro ao retomar trilha:', err);
      toast.error('Falha ao retomar trilha corporativa.', { id: tId });
    }
  };

  // Função para desistir da trilha (Desassocia, apaga neon e reseta progresso de leitura seguro)
  const handleAbandonPath = async (path: LearningPath) => {
    if (!uid || !orgId) return;

    const confirmAbandon = confirm(
      `Deseja realmente desistir da missão "${path.name}"?\n\n` +
      `• Suas HubCoins obtidas continuam com você na sua carteira! 🪙\n` +
      `• As auras neon e os vínculos dos livros serão removidos da sua estante.\n` +
      `• O progresso de leitura destes livros será redefinido para zero.\n` +
      `• Você poderá recomeçar do zero no futuro quando quiser!`
    );
    if (!confirmAbandon) return;

    const tId = toast.loading(`Cancelando missão "${path.name}"...`);
    try {
      const progressRef = doc(db, 'organizations', orgId, 'users', uid, 'learningPaths', path.id);
      const progressSnap = await getDoc(progressRef);
      const welcomeRewardClaimed = progressSnap.exists() ? !!progressSnap.data()?.welcomeRewardClaimed : false;

      // 1. Reseta o progresso para NOT_STARTED preservando a flag welcomeRewardClaimed
      await setDoc(progressRef, {
        pathId: path.id,
        userId: uid,
        status: 'NOT_STARTED',
        startedAt: 0,
        completedAt: null,
        completedBookIds: [],
        progressPercentage: 0,
        welcomeRewardClaimed
      });

      // 2. Limpa os vínculos, auras e progresso de leitura dos livros vinculados na estante
      const currentBooks = [...useNexusStore.getState().books];
      const updatedBooks = currentBooks.map(b => {
        if (b.learningPathId === path.id) {
          return {
            ...b,
            learningPathId: undefined,
            neonColor: undefined,
            currentPage: 0,
            maxPageRead: 0, // Permite ler e pontuar do zero ao reiniciar
            status: 'want_to_read' as const
          };
        }
        return b;
      });

      const profileRef = doc(db, 'profiles', uid);
      await updateDoc(profileRef, {
        'nexusData.books': updatedBooks
      });
      useNexusStore.getState().setBooks(updatedBooks);

      toast.success(`Você desistiu da missão. Suas HubCoins foram salvas e seus livros foram limpos na estante! 🛑`, { id: tId, duration: 6000 });
    } catch (err) {
      console.error('Erro ao desistir da trilha:', err);
      toast.error('Falha ao desistir da trilha corporativa.', { id: tId });
    }
  };

  // Função para criar ou editar uma nova trilha (Admin)
  const handleCreateOrUpdatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !uid) return;

    if (!name.trim()) return toast.error('O nome da trilha é obrigatório.');
    if (selectedBookIds.length === 0) return toast.error('Selecione pelo menos um livro para a trilha.');

    const isEdit = !!editingPath;
    const tId = toast.loading(isEdit ? 'Atualizando trilha...' : 'Registrando nova trilha...');
    try {
      const pathId = isEdit ? editingPath.id : `path_${Date.now()}`;
      const pathData: LearningPath = {
        id: pathId,
        name,
        description,
        benefit,
        neonColor,
        bookIds: selectedBookIds,
        hubCoinReward,
        createdAt: isEdit ? editingPath.createdAt : Date.now(),
        createdBy: isEdit ? editingPath.createdBy : uid
      };

      await setDoc(doc(db, 'organizations', orgId, 'learningPaths', pathId), pathData);
      
      handleCloseModal();
      toast.success(isEdit ? 'Trilha de Conhecimento atualizada com sucesso! 📚' : 'Trilha de Conhecimento registrada com sucesso! 📚', { id: tId });
    } catch (err) {
      console.error('Erro ao salvar trilha:', err);
      toast.error(isEdit ? 'Erro ao atualizar trilha.' : 'Erro ao registrar trilha.', { id: tId });
    }
  };

  // Função para deletar uma trilha (Admin)
  const handleDeletePath = async (pathId: string) => {
    if (!orgId) return;
    if (!confirm('Deseja realmente excluir esta trilha? O progresso da equipe será arquivado.')) return;

    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'learningPaths', pathId));
      toast.success('Trilha excluída com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir trilha.');
    }
  };

  const toggleBookSelection = (id: string) => {
    setSelectedBookIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Título & Painel Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em]">Gamificação Cognitiva</span>
          <h2 className="text-3xl font-black text-white tracking-tighter leading-none mt-1">TRILHAS DE CONHECIMENTO</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Conquiste distintivos neon de leitura e fature recompensas no HubShop</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-primary-400/20 self-start md:self-center cursor-pointer shadow-lg shadow-primary-500/10"
          >
            <Plus size={14} />
            {isCreating ? 'Voltar às Trilhas' : 'Criar Nova Trilha'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isCreating && isAdmin && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <motion.form
              key="create-form"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onSubmit={handleCreateOrUpdatePath}
              className="bg-[#0b0d14] border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botão de Fechar X no topo */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-10 -mt-10 bg-primary-500 opacity-20 pointer-events-none" />
              
              <h3 className="text-md font-black uppercase tracking-widest text-white">
                {editingPath ? 'Editar Trilha Estratégica' : 'Criar Trilha Estratégica'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Nome da Trilha</label>
                  <input
                    type="text"
                    placeholder="Ex: Mestre da Negociação"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Prêmio de HubCoins</label>
                  <input
                    type="number"
                    placeholder="Ex: 200"
                    value={hubCoinReward}
                    onChange={e => setHubCoinReward(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Declaração (Meta)</label>
                  <textarea
                    placeholder="Explique o foco desta trilha..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2.5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Benefício Cognitivo</label>
                  <textarea
                    placeholder="Ex: Esta trilha capacitará para reverter objeções..."
                    value={benefit}
                    onChange={e => setBenefit(e.target.value)}
                    rows={2.5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Seletor de Aura Neon */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Aura Neon Exclusiva</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.keys(NEON_AURA_MAP).map(key => {
                    const aura = NEON_AURA_MAP[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNeonColor(key)}
                        className={`p-2.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          neonColor === key
                            ? `bg-white/10 ${aura.border} text-white shadow-md`
                            : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${aura.gradient} ${aura.glow}`} />
                        {key.replace('-', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seleção de Livros da Comunidade */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Vincular Livros da Comunidade</label>
                {communityBooks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1.5">
                    {communityBooks.map(book => {
                      const isSelected = selectedBookIds.includes(book.id);
                      return (
                        <div
                          key={book.id}
                          onClick={() => toggleBookSelection(book.id)}
                          className={`p-2.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                              : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden pr-2">
                            <div className="w-6 h-8 bg-slate-900 border border-white/10 rounded overflow-hidden shrink-0 flex items-center justify-center text-[5px]">
                              {book.coverUrl ? (
                                <img src={book.coverUrl} alt="Capa" className="w-full h-full object-cover" />
                              ) : (
                                'CAPA'
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[9px] font-black uppercase tracking-wider truncate leading-tight">{book.title}</h4>
                              <p className="text-[7.5px] opacity-50 truncate uppercase font-bold">{book.author || 'Sem Autor'}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-3 h-3 rounded border-white/15 accent-primary-500 shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-white/5 rounded-xl opacity-60">
                    <BookOpen size={20} className="mx-auto mb-1 text-gray-600" />
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Nenhum livro publicado no Nexus.</p>
                  </div>
                )}
              </div>

              {/* Botões de Ação Inferiores */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-primary-500/20"
                >
                  {editingPath ? 'Salvar Alterações' : 'Registrar Trilha de Conhecimento'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paths.length > 0 ? (
              paths.map(path => {
                const progress = userProgresses[path.id];
                const isStarted = progress && progress.status !== 'NOT_STARTED';
                const isCompleted = progress?.status === 'COMPLETED';
                const isPaused = progress?.status === 'PAUSED';
                const aura = NEON_AURA_MAP[path.neonColor] || NEON_AURA_MAP['acid-lime'];

                return (
                  <div
                    key={path.id}
                    className={`bg-slate-950/40 border backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-8 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl relative overflow-hidden group min-h-[320px] ${
                      isCompleted
                        ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)] bg-yellow-500/[0.01]'
                        : isPaused
                          ? 'border-white/5 bg-slate-950/15'
                          : isStarted
                            ? `${aura.border} shadow-[0_0_25px_rgba(255,255,255,0.02)]`
                            : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Efeito Glow Pulsante Traseiro sutil apenas se estiver ativa ou concluída e não pausada */}
                    {isStarted && !isPaused && (
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-8 -mt-8 ${isCompleted ? 'bg-yellow-500 opacity-15 animate-pulse' : `bg-gradient-to-br ${aura.gradient} opacity-20 animate-pulse`} pointer-events-none`} />
                    )}

                    <div className="space-y-4">
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${
                            isCompleted ? 'text-yellow-400' : isPaused ? 'text-gray-500' : isStarted ? 'text-cyan-400' : 'text-slate-500'
                          }`}>
                            {isCompleted ? '🏆 Trilha Concluída' : isPaused ? '⏸️ Missão Pausada' : isStarted ? '⚡ Missão Ativa' : '📖 Trilha Disponível'}
                          </span>
                          <h3 className="text-base font-black text-white uppercase tracking-wider truncate leading-tight group-hover:text-primary-400 transition-colors">
                            {path.name}
                          </h3>
                        </div>

                        {/* Distintivo / Moedas */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl shrink-0">
                          <Trophy size={12} className="text-yellow-400 animate-bounce" />
                          <span className="text-[10px] font-black text-yellow-400 tracking-wider">+{path.hubCoinReward}</span>
                          <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Coins</span>
                        </div>
                      </div>

                      {/* Descrições */}
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed pr-2">
                          {path.description}
                        </p>

                        {/* Benefício Cognitivo */}
                        {path.benefit && (
                          <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-2.5 items-start">
                            <Sparkles size={14} className="text-primary-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-primary-400 uppercase tracking-[0.2em]">Impacto Cognitivo</span>
                              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{path.benefit}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lista de Livros da Trilha */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Livros da Missão ({path.bookIds.length})</span>
                        <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto no-scrollbar">
                          {path.bookIds.map(bookId => {
                            const b = communityBooks.find(x => x.id === bookId);
                            const isBookCompleted = progress?.completedBookIds?.includes(bookId);

                            return (
                              <div
                                key={bookId}
                                className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                  isBookCompleted
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 border-white/5 text-gray-400'
                                }`}
                              >
                                {isBookCompleted ? (
                                  <CheckCircle size={10} className="shrink-0 text-emerald-400" />
                                ) : (
                                  <BookOpen size={10} className="shrink-0 text-gray-500" />
                                )}
                                <span className="truncate max-w-[120px]">{b?.title || 'Obra Removida'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé / Ações */}
                    <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-4">
                      {isStarted ? (
                        <div className="space-y-4 w-full">
                          {/* Barra de Progresso e Info */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-wider">
                              <span>Progresso Cognitivo</span>
                              <div className="flex items-center gap-2">
                                {isPaused && <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded-md text-gray-400 animate-pulse">Pausada</span>}
                                <span className="text-white font-mono">{progress?.progressPercentage || 0}%</span>
                              </div>
                            </div>
                            
                            {/* Barra de Progresso */}
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full transition-all duration-700 ${
                                  isCompleted
                                    ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                    : isPaused
                                      ? 'bg-slate-600 shadow-none'
                                      : `bg-gradient-to-r ${aura.gradient} shadow-[0_0_10px_rgba(255,255,255,0.05)]`
                                }`}
                                style={{ width: `${progress?.progressPercentage || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Botões de Ação para Trilhas Ativas / Pausadas */}
                          {!isCompleted && (
                            <div className="flex items-center gap-2 w-full">
                              {isPaused ? (
                                <button
                                  type="button"
                                  onClick={() => handleResumePath(path)}
                                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/10 border border-emerald-400/20"
                                >
                                  Retomar Missão ⚡
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePausePath(path)}
                                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                >
                                  Pausar ⏸️
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAbandonPath(path)}
                                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all"
                                title="Desistir da Trilha"
                              >
                                Desistir 🛑
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartPath(path)}
                          className={`w-full py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 border transition-all ${
                            path.bookIds.length === 0
                              ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                              : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 border-primary-400/20 active:scale-95'
                          }`}
                          disabled={path.bookIds.length === 0}
                        >
                          Aceitar e Iniciar Missão
                          <ArrowRight size={12} />
                        </button>
                      )}

                      {/* Ações pelo Admin */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 mt-3 self-end shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(path)}
                            className="p-2.5 bg-white/5 hover:bg-primary-500/10 border border-white/5 hover:border-primary-500/20 text-gray-500 hover:text-primary-400 rounded-xl transition-all cursor-pointer"
                            title="Editar Trilha"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePath(path.id)}
                            className="p-2.5 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-gray-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                            title="Excluir Trilha"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center border border-dashed border-white/5 bg-slate-950/10 rounded-[3rem] opacity-60 col-span-2 select-none">
                <Award size={48} className="text-gray-600 mx-auto mb-4" />
                <h4 className="text-base font-black text-gray-400 uppercase tracking-widest">Nenhuma Trilha Ativa</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Fique de olho! O administrador lançará metas de carreira e leitura em breve.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
