import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, Trash2, Edit2, Search, AlertTriangle, CheckCircle2, Package, Coins, Minus, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useDialog } from '@auth/contexts/DialogContext';

interface PortalInventoryProps {
  orgId: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  costPerUnit: number;
}

export default function PortalInventory({ orgId }: PortalInventoryProps) {
  const { confirm } = useDialog();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados da Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [minQuantity, setMinQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escuta os itens no Firestore
  useEffect(() => {
    if (!orgId) return;
    const inventoryRef = collection(db, 'organizations', orgId, 'inventory');
    const q = query(inventoryRef, orderBy('name', 'asc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setItems(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao escutar inventário:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [orgId]);

  const openAddModal = () => {
    setEditingItemId(null);
    setName('');
    setQuantity('');
    setUnit('g');
    setMinQuantity('');
    setCostPerUnit('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    setMinQuantity(item.minQuantity.toString());
    setCostPerUnit(item.costPerUnit.toString().replace('.', ','));
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || quantity === '' || minQuantity === '' || costPerUnit === '' || !orgId) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        quantity: Number(quantity),
        unit,
        minQuantity: Number(minQuantity),
        costPerUnit: Number(costPerUnit.replace(',', '.')),
        updatedAt: serverTimestamp()
      };

      if (editingItemId) {
        await updateDoc(doc(db, 'organizations', orgId, 'inventory', editingItemId), payload);
        toast.success('Insumo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'organizations', orgId, 'inventory'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Insumo cadastrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar o insumo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Insumo',
      message: 'Tem certeza que deseja excluir permanentemente este insumo?',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar'
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'inventory', id));
      toast.success('Insumo removido com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover o insumo.');
    }
  };

  // Ajuste rápido de quantidade (ex: +100g, -100g ou +1un, -1un)
  const handleQuickAdjust = async (item: InventoryItem, amount: number) => {
    const newQty = Math.max(0, item.quantity + amount);
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'inventory', item.id), {
        quantity: newQty,
        updatedAt: serverTimestamp()
      });
      toast.success(`Estoque ajustado: ${newQty}${item.unit}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ajustar estoque.');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar insumos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 w-full outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-gray-600 text-sm text-white"
          />
        </div>

        <button
          onClick={openAddModal}
          className="px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-primary-500/10 text-sm"
        >
          <Plus size={18} />
          Cadastrar Insumo
        </button>
      </div>

      {/* Grid of Items */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-500 text-xs">Carregando inventário...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" strokeWidth={1} />
          <p className="text-gray-400 text-sm italic">Nenhum insumo encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.minQuantity;
            return (
              <div 
                key={item.id}
                className={`
                  relative bg-white/[0.03] backdrop-blur-2xl border p-6 rounded-[2rem] flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05]
                  ${isLowStock 
                    ? 'border-amber-500/30 shadow-amber-950/10' 
                    : 'border-white/10'}
                `}
              >
                <div>
                  {/* Status Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Insumo</span>
                    {isLowStock ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-tight">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Estoque Baixo
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-tight">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Saudável
                      </div>
                    )}
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{item.name}</h4>
                  
                  {/* Stock Quantity */}
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-black text-white">{item.quantity}</span>
                    <span className="text-gray-400 font-bold text-sm">{item.unit}</span>
                  </div>

                  {/* Cost Details */}
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nível Mínimo:</span>
                      <span className="text-gray-300 font-mono font-bold">{item.minQuantity} {item.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Custo por {item.unit}:</span>
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <Coins size={12} />
                        R$ {item.costPerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                  {/* Quick +/- adjustments */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickAdjust(item, item.unit === 'g' ? -100 : -1)}
                      className="p-2 hover:bg-white/5 text-gray-400 hover:text-white border border-white/10 rounded-xl transition-all active:scale-90"
                      title={item.unit === 'g' ? "Subtrair 100g" : "Subtrair 1 unidade"}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(item, item.unit === 'g' ? 100 : 1)}
                      className="p-2 hover:bg-white/5 text-gray-400 hover:text-white border border-white/10 rounded-xl transition-all active:scale-90"
                      title={item.unit === 'g' ? "Somar 100g" : "Somar 1 unidade"}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Edit/Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Package className="text-primary-500 w-5 h-5" />
              {editingItemId ? 'Editar Insumo' : 'Cadastrar Novo Insumo'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Nome do Insumo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Filamento PLA Azul"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Qtd Atual *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Unidade *</label>
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-primary-500 text-sm text-white font-bold"
                  >
                    <option value="g" className="bg-[#111]">g (gramas)</option>
                    <option value="kg" className="bg-[#111]">kg (quilos)</option>
                    <option value="L" className="bg-[#111]">L (litros)</option>
                    <option value="un" className="bg-[#111]">un (unidades)</option>
                    <option value="m" className="bg-[#111]">m (metros)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Estoque Mínimo *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="Mínimo crítico"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Custo Unitário (R$) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="0,00"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-black rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-500/10"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
