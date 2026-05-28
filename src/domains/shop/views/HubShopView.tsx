import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, ShoppingBag, Plus, X, Lock, CheckCircle, Package, ArrowRight, Tag, Gift, Trash2, Eye, EyeOff, Sparkles, AlertTriangle, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { toast } from 'sonner';
import { useArenaStore } from '@store/useArenaStore';
import { uploadToCloudinary } from '@/lib/cloudinary';

import { usePermissions } from '@auth/hooks/usePermissions';

export interface HubShopItem {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  type: 'PHYSICAL' | 'VOUCHER' | 'EXPERIENCE';
  stock: number | null;
  isActive: boolean;
  createdAt: number;
}

export interface HubShopOrder {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  itemId: string;
  itemTitle: string;
  itemImageUrl: string;
  pricePaid: number;
  status: 'PENDING' | 'APPROVED' | 'DELIVERED';
  createdAt: number;
}

export default function HubShopView() {
  const { userProfile, user } = useAuth();
  const { teamProfiles = [] } = useCRM();
  const { hasPermission } = usePermissions();

  // Estados dos Itens da Loja e Pedidos
  const [items, setItems] = useState<HubShopItem[]>([]);
  const [orders, setOrders] = useState<HubShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados locais do Administrador (Novo Prêmio / Edição)
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<HubShopItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(100);
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'PHYSICAL' | 'VOUCHER' | 'EXPERIENCE'>('PHYSICAL');
  const [stock, setStock] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Paginação dos produtos
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Seletor de visualização (Visualização Geral ou Gestão de Pedidos)
  const [activeView, setActiveView] = useState<'shop' | 'my-orders' | 'admin-orders'>('shop');

  // Estados para Modais de Confirmação Personalizados e Ajuste de Moedas (Admin)
  const [itemToRedeem, setItemToRedeem] = useState<HubShopItem | null>(null);
  const [itemIdToDelete, setItemIdToDelete] = useState<string | null>(null);
  const [isAdjustingCoins, setIsAdjustingCoins] = useState(false);
  const [newAdminCoins, setNewAdminCoins] = useState<number | ''>('');

  const orgId = userProfile?.orgId;
  const uid = user?.uid;
  const isAdmin = hasPermission('MANAGE_SETTINGS') || hasPermission('MANAGE_TEAM');

  // Executar ajuste de saldo do Admin (apenas redução)
  const handleAdjustAdminCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !orgId || newAdminCoins === '') return;

    const credits = userProfile?.arenaCredits || 0;
    if (newAdminCoins > credits) {
      return toast.error('Apenas redução do saldo de HubCoins é permitida para garantir testes justos.');
    }
    if (newAdminCoins < 0) {
      return toast.error('O saldo mínimo permitido é 0 HubCoins.');
    }

    const tId = toast.loading('Atualizando carteira do Administrador...');
    try {
      const diff = newAdminCoins - credits;
      await useArenaStore.getState().addArenaCredits(uid, diff);
      setIsAdjustingCoins(false);
      setNewAdminCoins('');
      toast.success('Saldo da sua carteira ajustado com sucesso!', { id: tId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ajustar moedas virtuais.', { id: tId });
    }
  };

  // Executar exclusão confirmada de item (Admin)
  const confirmDeleteItem = async () => {
    if (!itemIdToDelete || !orgId) return;
    const id = itemIdToDelete;
    setItemIdToDelete(null);

    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'hubShopItems', id));
      toast.success('Prêmio excluído do catálogo.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir prêmio.');
    }
  };

  // Executar resgate confirmado de item (Colaborador)
  const confirmRedeemItem = async () => {
    if (!itemToRedeem || !uid || !orgId || !userProfile) return;
    const item = itemToRedeem;
    setItemToRedeem(null);

    const credits = userProfile?.arenaCredits || 0;
    const tId = toast.loading('Processando resgate de moedas...');
    try {
      // 1. Cria a Ordem de Pedido no Firestore
      const orderId = `order_${Date.now()}`;
      const orderData: HubShopOrder = {
        id: orderId,
        userId: uid,
        userName: userProfile.displayName || 'Hubber',
        userPhoto: userProfile.photoURL || undefined,
        itemId: item.id,
        itemTitle: item.title,
        itemImageUrl: item.imageUrl,
        pricePaid: item.price,
        status: 'PENDING',
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'organizations', orgId, 'hubShopOrders', orderId), orderData);

      // 2. Deduz as moedas do saldo do colaborador
      await useArenaStore.getState().addArenaCredits(uid, -item.price);

      // 3. Atualiza o estoque do item se houver limite
      if (item.stock !== null) {
        await updateDoc(doc(db, 'organizations', orgId, 'hubShopItems', item.id), {
          stock: Math.max(0, item.stock - 1)
        });
      }

      toast.success(`🎉 RESGATE EFETUADO! Você resgatou "${item.title}"! Procure o RH para retirar seu prêmio.`, { id: tId, duration: 6000 });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar transação.', { id: tId });
    }
  };

  // Limpa o formulário e fecha o modal de cadastro/edição
  const handleCloseModal = () => {
    setTitle('');
    setDescription('');
    setPrice(100);
    setImageUrl('');
    setType('PHYSICAL');
    setStock(null);
    setIsAdding(false);
    setEditingItem(null);
  };

  // Carrega dados para edição e abre o modal
  const handleOpenEdit = (item: HubShopItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setPrice(item.price);
    setImageUrl(item.imageUrl);
    setType(item.type);
    setStock(item.stock);
    setIsAdding(true);
  };
  const credits = userProfile?.arenaCredits || 0;

  // Escuta os itens da loja e pedidos do Firestore
  useEffect(() => {
    if (!orgId) return;

    // 1. Escuta Itens da Loja
    const itemsCol = collection(db, 'organizations', orgId, 'hubShopItems');
    const qItems = query(itemsCol, orderBy('createdAt', 'desc'));
    const unsubItems = onSnapshot(qItems, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as HubShopItem));
      setItems(list);
      setLoading(false);
    });

    // 2. Escuta Pedidos de Resgate
    const ordersCol = collection(db, 'organizations', orgId, 'hubShopOrders');
    const qOrders = query(ordersCol, orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as HubShopOrder));
      setOrders(list);
    });

    return () => {
      unsubItems();
      unsubOrders();
    };
  }, [orgId]);

  // Função para fazer upload da foto diretamente no Cloudinary
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const tId = toast.loading('Fazendo upload da imagem do prêmio no Cloudinary...');
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
      toast.success('Imagem enviada com sucesso!', { id: tId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fazer upload da imagem.', { id: tId });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para cadastrar ou editar prêmio (Admin)
  const handleCreateOrUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    if (!title.trim()) return toast.error('O título do prêmio é obrigatório.');
    if (!imageUrl) return toast.error('A foto do prêmio é obrigatória.');
    if (price <= 0) return toast.error('O preço deve ser superior a zero.');

    const isEdit = !!editingItem;
    const tId = toast.loading(isEdit ? 'Atualizando premiação no HubShop...' : 'Salvando nova premiação no HubShop...');
    try {
      const itemId = isEdit ? editingItem.id : `shop_${Date.now()}`;
      const itemData: HubShopItem = {
        id: itemId,
        title,
        description,
        price,
        imageUrl,
        type,
        stock: stock !== null && stock >= 0 ? stock : null,
        isActive: isEdit ? editingItem.isActive : true,
        createdAt: isEdit ? editingItem.createdAt : Date.now()
      };

      await setDoc(doc(db, 'organizations', orgId, 'hubShopItems', itemId), itemData);
      
      handleCloseModal();
      toast.success(isEdit ? 'Prêmio atualizado com sucesso! 🎁' : 'Prêmio adicionado ao catálogo do HubShop! 🎁', { id: tId });
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? 'Erro ao atualizar prêmio.' : 'Erro ao cadastrar prêmio.', { id: tId });
    }
  };

  // Função para resgatar um prêmio (Colaborador)
  const handleRedeemItem = (item: HubShopItem) => {
    if (!uid || !orgId || !userProfile) return;

    const credits = userProfile?.arenaCredits || 0;
    if (credits < item.price) {
      return toast.error('Saldo de HubCoins insuficiente.');
    }

    if (item.stock !== null && item.stock <= 0) {
      return toast.error('Este prêmio está temporariamente sem estoque.');
    }

    setItemToRedeem(item);
  };

  // Função para aprovar ou dar baixa em pedidos (Admin)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'APPROVED' | 'DELIVERED') => {
    if (!orgId) return;

    try {
      await updateDoc(doc(db, 'organizations', orgId, 'hubShopOrders', orderId), {
        status: newStatus
      });
      toast.success(`Pedido atualizado para ${newStatus === 'APPROVED' ? 'Aprovado' : 'Entregue'}!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar pedido.');
    }
  };

  // Função para desativar/reativar item da loja (Admin)
  const handleToggleItemActive = async (item: HubShopItem) => {
    if (!orgId) return;

    try {
      await updateDoc(doc(db, 'organizations', orgId, 'hubShopItems', item.id), {
        isActive: !item.isActive
      });
      toast.success(item.isActive ? 'Prêmio pausado na loja.' : 'Prêmio reativado na loja!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status do prêmio.');
    }
  };

  // Função para deletar item da loja (Admin)
  const handleDeleteItem = (itemId: string) => {
    if (!orgId) return;
    setItemIdToDelete(itemId);
  };

  const myOrders = orders.filter(o => o.userId === uid);
  const pendingOrders = orders.filter(o => o.status === 'PENDING');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Acessando HubShop...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-100px)] p-8 bg-[#030712]/40 relative overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* Glow Roxo Superior */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -mr-20 -mt-20 bg-purple-600 opacity-15 pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER DA VIEW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] flex items-center gap-1.5">
              Loja Oficial do CRM
              <Sparkles size={12} className="text-yellow-400 animate-pulse" />
            </span>
            <h1 className="text-4xl font-black text-white tracking-tighter leading-none">HUBSHOP & RECOMPENSAS</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">RESGATE PRODUTOS FÍSICOS, VOUCHERS E EXPERIÊNCIAS ÚNICAS COM SUAS HUBCOINS</p>
          </div>

          {/* Saldo de Moedas & Botão de Criação */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Carteira Translúcida Premium */}
            <div className="flex items-center gap-3.5 px-5 py-3 bg-[#0a0c10]/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl shadow-black/20 relative group">
              <div className="p-2 bg-yellow-500/10 rounded-xl">
                <Coins size={18} className="text-yellow-400 animate-bounce" />
              </div>
              <div className="flex-1 pr-6">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none block">Carteira Hub</span>
                <span className="text-lg font-black text-yellow-400 tracking-wider flex items-center gap-1.5 mt-0.5">
                  {credits}
                  <span className="text-[8px] font-black text-yellow-500/60 uppercase tracking-widest leading-none">HubCoins</span>
                </span>
              </div>
              
              {isAdmin && (
                <button
                  onClick={() => {
                    setNewAdminCoins(credits);
                    setIsAdjustingCoins(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 rounded-lg cursor-pointer border border-yellow-500/10"
                  title="Ajustar Saldo de Testes (Admin)"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-purple-400/20 shadow-lg shadow-purple-500/10 cursor-pointer"
              >
                <Plus size={14} />
                {isAdding ? 'Ver Catálogo' : 'Cadastrar Premiação'}
              </button>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE SEÇÕES */}
        <div className="flex gap-2 border-b border-white/5 pb-3">
          <button
            onClick={() => { setIsAdding(false); setActiveView('shop'); }}
            className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeView === 'shop' && !isAdding
                ? 'border-purple-500 text-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.15)]'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            🛍️ Vitrine de Prêmios
          </button>
          <button
            onClick={() => { setIsAdding(false); setActiveView('my-orders'); }}
            className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer relative ${
              activeView === 'my-orders'
                ? 'border-purple-500 text-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.15)]'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            📦 Meus Resgates
            {myOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-bold rounded-md">
                {myOrders.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => { setIsAdding(false); setActiveView('admin-orders'); }}
              className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer relative ${
                activeView === 'admin-orders'
                  ? 'border-purple-500 text-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.15)]'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              👑 Gestão de Pedidos
              {pendingOrders.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-md animate-pulse">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          )}
        </div>

        <AnimatePresence>
          {/* MODAL FLUTUANTE DE CADASTRO/EDIÇÃO (ADMIN) */}
          {isAdding && isAdmin && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={(e) => {
                if (e.target === e.currentTarget) handleCloseModal();
              }}
            >
              <motion.form
                key="add-form"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onSubmit={handleCreateOrUpdateItem}
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

                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-10 -mt-10 bg-purple-600 opacity-15 pointer-events-none" />
                
                <h3 className="text-md font-black uppercase tracking-widest text-white">
                  {editingItem ? 'Editar Prêmio Corporativo' : 'Adicionar Prêmio Corporativo'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Título da Recompensa</label>
                    <input
                      type="text"
                      placeholder="Ex: Caneca e Camiseta Hub"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Preço em HubCoins</label>
                    <input
                      type="number"
                      placeholder="Ex: 500"
                      value={price}
                      onChange={e => setPrice(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Tipo da Premiação</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all"
                    >
                      <option value="PHYSICAL">Produto Físico</option>
                      <option value="VOUCHER">Voucher Digital</option>
                      <option value="EXPERIENCE">Experiência</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Estoque (Opcional)</label>
                    <input
                      type="number"
                      placeholder="Sem Limite"
                      value={stock === null ? '' : stock}
                      onChange={e => setStock(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Regra de Resgate</label>
                  <textarea
                    placeholder="Descreva as características do prêmio..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2.5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Upload de Foto no Cloudinary */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Foto do Prêmio (Cloudinary)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploading}
                        className="hidden"
                        id="reward-photo-input"
                      />
                      <label
                        htmlFor="reward-photo-input"
                        className={`w-full py-3 px-4 border border-dashed border-white/15 hover:border-purple-500/50 rounded-xl bg-white/[0.02] flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          isUploading ? 'opacity-50 cursor-wait' : ''
                        }`}
                      >
                        <ShoppingBag size={12} className="text-gray-400" />
                        <span className="text-[9px] font-black text-gray-400 group-hover:text-purple-400 uppercase tracking-widest">
                          {isUploading ? 'Enviando...' : 'Selecionar Capa'}
                        </span>
                      </label>
                    </div>

                    {imageUrl && (
                      <div className="w-14 h-14 rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-lg">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Inferiores */}
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
                    disabled={isUploading}
                    className="flex-1 py-3.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {editingItem ? 'Salvar Alterações' : 'Catalogar no HubShop'}
                  </button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeView === 'shop' ? (
            // VITRINE PRINCIPAL DE PRÊMIOS
            <motion.div
              key="vitrine"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Grid 25% Menor - 5 Colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.length > 0 ? (
                  (() => {
                    const filteredItems = items.filter(item => item.isActive || isAdmin);
                    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
                    const validCurrentPage = Math.min(currentPage, totalPages);
                    const paginatedItems = filteredItems.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

                    return paginatedItems.map(item => {
                      const canAfford = credits >= item.price;
                      const hasStock = item.stock === null || item.stock > 0;

                      return (
                        <div
                          key={item.id}
                          className={`bg-[#0a0c10]/40 backdrop-blur-2xl border rounded-[1.75rem] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl relative group ${
                            !item.isActive
                              ? 'border-white/5 opacity-50 grayscale'
                              : canAfford && hasStock
                                ? 'border-white/5 hover:border-purple-500/30'
                                : 'border-white/5'
                          }`}
                        >
                          {/* Selo do Tipo */}
                          <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[7px] font-black text-purple-400 border border-purple-500/20 uppercase tracking-widest shadow-md">
                            {item.type === 'PHYSICAL' ? '📦 Físico' : item.type === 'VOUCHER' ? '🎟️ Voucher' : '🌟 Exp.'}
                          </span>

                          {/* Selo de Estoque */}
                          {item.stock !== null && (
                            <span className={`absolute top-3 right-3 z-20 px-2 py-0.5 rounded-md text-[7px] font-black border uppercase tracking-widest shadow-md ${
                              item.stock > 0
                                ? 'bg-black/60 backdrop-blur-md border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 border-red-500/30 text-red-400'
                            }`}>
                              {item.stock > 0 ? `Estoque: ${item.stock}` : 'Sem estoque'}
                            </span>
                          )}

                          {/* Imagem do Produto (Aspect 4:3 para ser 25% mais compacto) */}
                          <div className="aspect-[4/3] w-full bg-[#16181f] relative overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <Gift size={32} className="text-gray-500" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-65 z-10" />
                          </div>

                          {/* Detalhes (Padding menor p-4, e fontes text-xs) */}
                          <div className="p-4.5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-1">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white truncate max-w-[120px] leading-tight" title={item.title}>
                                  {item.title}
                                </h3>
                                <div className="flex items-center gap-0.5 shrink-0 bg-yellow-500/5 px-2 py-0.5 border border-yellow-500/20 rounded-lg">
                                  <Coins size={10} className="text-yellow-400" />
                                  <span className="text-[9px] font-black text-yellow-400">{item.price}</span>
                                </div>
                              </div>
                              
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed line-clamp-2 min-h-[26px]">
                                {item.description}
                              </p>
                            </div>

                            {/* Botão de Compra / Resgate e Ações Admin */}
                            <div className="pt-3 border-t border-white/5 flex gap-1.5">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemActive(item)}
                                    className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                      item.isActive
                                        ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    }`}
                                    title={item.isActive ? 'Pausar prêmio na loja' : 'Ativar prêmio na loja'}
                                  >
                                    {item.isActive ? <EyeOff size={11} /> : <Eye size={11} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="p-2 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/20 text-gray-500 hover:text-purple-400 rounded-xl transition-all cursor-pointer shrink-0"
                                    title="Editar prêmio"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-2 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-gray-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer shrink-0"
                                    title="Excluir prêmio"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleRedeemItem(item)}
                                disabled={!canAfford || !hasStock || !item.isActive}
                                className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 border transition-all ${
                                  !item.isActive
                                    ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                                    : !hasStock
                                      ? 'bg-red-500/5 border-red-500/10 text-red-500 cursor-not-allowed'
                                      : canAfford
                                        ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md shadow-purple-500/20 border-purple-400/20 active:scale-95'
                                        : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                                }`}
                              >
                                {!item.isActive ? (
                                  'Pausado'
                                ) : !hasStock ? (
                                  'Esgotado'
                                ) : canAfford ? (
                                  <>
                                    Resgatar
                                    <ArrowRight size={10} />
                                  </>
                                ) : (
                                  <div className="flex items-center gap-0.5 text-red-500/60 font-black">
                                    <Lock size={8} /> -{item.price - credits}
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="py-24 text-center border border-dashed border-white/5 bg-slate-950/10 rounded-[3rem] opacity-60 col-span-5 select-none w-full">
                    <ShoppingBag size={48} className="text-gray-600 mx-auto mb-4" />
                    <h4 className="text-base font-black text-gray-400 uppercase tracking-widest">Loja Vazia</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">O administrador ainda não cadastrou prêmios para resgate.</p>
                  </div>
                )}
              </div>

              {/* BARRA DE PAGINAÇÃO DE ELITE */}
              {(() => {
                const filteredItems = items.filter(item => item.isActive || isAdmin);
                const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
                
                if (totalPages <= 1) return null;
                
                return (
                  <div className="flex items-center justify-between border-t border-white/5 pt-6 select-none">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      Mostrando {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredItems.length, currentPage * itemsPerPage)} de {filteredItems.length} prêmios
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          currentPage === 1
                            ? 'border-white/5 text-gray-600 bg-white/2 cursor-not-allowed'
                            : 'border-white/10 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95'
                        }`}
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded-xl border text-[9px] font-black transition-all cursor-pointer active:scale-95 ${
                            currentPage === page
                              ? 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/25'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          currentPage === totalPages
                            ? 'border-white/5 text-gray-600 bg-white/2 cursor-not-allowed'
                            : 'border-white/10 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95'
                        }`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : activeView === 'my-orders' ? (
            // LISTA DE RESGATES DO PRÓPRIO COLABORADOR
            <motion.div
              key="my-orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Seus Pedidos de Resgate</h3>
              {myOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-[#0a0c10]/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-5 flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-4 min-w-0 pr-2">
                        <div className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shrink-0">
                          <img src={order.itemImageUrl} alt={order.itemTitle} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider">
                            ID: {order.id}
                          </span>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider truncate mt-0.5">
                            {order.itemTitle}
                          </h4>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Debitado: <span className="text-yellow-400 font-black">{order.pricePaid} HubCoins 🪙</span>
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shrink-0 ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : order.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-yellow-500/5 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {order.status === 'DELIVERED' ? '✓ Entregue' : order.status === 'APPROVED' ? '⚡ Aprovado' : '⏳ Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed border-white/5 bg-slate-950/10 rounded-[2.5rem] opacity-60">
                  <Package size={36} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Você ainda não realizou nenhum resgate.</p>
                </div>
              )}
            </motion.div>
          ) : (
            // PAINEL DE GESTÃO DE PEDIDOS (ADMIN)
            <motion.div
              key="admin-orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 animate-in fade-in duration-300"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Gestão Geral de Resgates</h3>
                <span className="text-[9px] font-black text-gray-500 bg-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Total de Pedidos: {orders.length}
                </span>
              </div>

              {orders.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {orders.map(order => {
                    const requester = teamProfiles.find(p => p.uid === order.userId);
                    const displayName = order.userName || requester?.displayName || requester?.name || 'Membro';
                    
                    return (
                      <div
                        key={order.id}
                        className="bg-[#0a0c10]/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:border-purple-500/20"
                      >
                        {/* Solicitante & Produto */}
                        <div className="flex flex-wrap items-center gap-4 min-w-0">
                          {/* Avatar do Solicitante */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0 overflow-hidden relative border border-white/10">
                              {order.userPhoto ? (
                                <img src={order.userPhoto} alt={displayName} className="w-full h-full object-cover" />
                              ) : (
                                displayName[0].toUpperCase()
                              )}
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">Colaborador</span>
                              <h4 className="text-[10px] font-black text-white uppercase tracking-wider mt-0.5">{displayName}</h4>
                            </div>
                          </div>

                          <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

                          {/* Prêmio */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shrink-0">
                              <img src={order.itemImageUrl} alt={order.itemTitle} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest leading-none">Item Resgatado</span>
                              <h4 className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[180px] mt-0.5">
                                {order.itemTitle}
                              </h4>
                            </div>
                          </div>
                        </div>

                        {/* Preço & Status Ação */}
                        <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t border-white/5 md:border-none">
                          <div className="text-left md:text-right">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none block">Custo</span>
                            <span className="text-xs font-mono font-black text-yellow-400 mt-1 block">{order.pricePaid} Coins 🪙</span>
                          </div>

                          {order.status === 'PENDING' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'APPROVED')}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Aprovar
                              </button>
                            </div>
                          ) : order.status === 'APPROVED' ? (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                            >
                              Dar Baixa / Entregar
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black rounded-xl uppercase tracking-widest">
                              ✓ Entregue
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed border-white/5 bg-slate-950/10 rounded-[2.5rem] opacity-60">
                  <Package size={36} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nenhum pedido de resgate efetuado pela equipe.</p>
                </div>
              )}
            </motion.div>
          )}

          {itemToRedeem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setItemToRedeem(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0b0d14] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full space-y-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-10 -mt-10 bg-purple-600 opacity-15 pointer-events-none" />
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-yellow-500/10 rounded-full animate-pulse">
                    <ShoppingBag size={24} className="text-yellow-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Confirmar Resgate</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    Deseja confirmar o resgate de <span className="text-white font-black">"{itemToRedeem.title}"</span> por <span className="text-yellow-400 font-black">{itemToRedeem.price} HubCoins</span>?
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setItemToRedeem(null)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmRedeemItem}
                    className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {itemIdToDelete && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setItemIdToDelete(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0b0d14] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full space-y-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-10 -mt-10 bg-red-600 opacity-15 pointer-events-none" />
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-red-500/10 rounded-full animate-bounce">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Excluir Premiação</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    Atenção: Esta ação é irreversível. Deseja realmente remover este prêmio da loja?
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setItemIdToDelete(null)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteItem}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/20"
                  >
                    Remover
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {isAdjustingCoins && isAdmin && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsAdjustingCoins(false)}
            >
              <motion.form
                onSubmit={handleAdjustAdminCoins}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0b0d14] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -mr-10 -mt-10 bg-yellow-600 opacity-15 pointer-events-none" />
                
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-yellow-500/10 rounded-xl">
                    <Coins size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Carteira de Testes</h3>
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Ferramenta do Administrador</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 block">Saldo Atual de Testes</label>
                  <span className="text-xs font-black text-yellow-400 font-mono block">{credits} HubCoins</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 block">Definir Novo Saldo (Apenas Redução)</label>
                  <input
                    type="number"
                    max={credits}
                    min={0}
                    placeholder="Novo saldo (menor que o atual)"
                    value={newAdminCoins}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                      setNewAdminCoins(val);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-yellow-500 outline-none transition-all font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setNewAdminCoins(0)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/10 cursor-pointer"
                >
                  Zerar Carteira de Testes
                </button>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustingCoins(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-yellow-500/15"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.form>
            </div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
