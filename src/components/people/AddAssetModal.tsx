import React, { useState } from 'react';
import { X, Plus, Package, Hash } from 'lucide-react';
import { ToolAsset } from '../../types';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  onSuccess: () => void;
}

const CATEGORIES = ['Notebook', 'Monitor', 'Celular', 'Cadeira', 'Periférico', 'Outro'];
const CONDITIONS = ['Novo', 'Bom', 'Desgastado', 'Danificado'];

export default function AddAssetModal({ isOpen, onClose, targetUserId, onSuccess }: AddAssetModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Notebook' as ToolAsset['category'],
    serialNumber: '',
    condition: 'Novo' as ToolAsset['condition']
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/team_handler?action=add-asset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: targetUserId,
          asset: {
            name: formData.name,
            category: formData.category,
            serialNumber: formData.serialNumber,
            condition: formData.condition
          }
        })
      });

      if (!res.ok) throw new Error('Erro ao vincular equipamento');

      toast.success('Equipamento vinculado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao vincular equipamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-primary-500/5">
          <div>
            <h3 className="text-2xl font-bold">Vincular Equipamento</h3>
            <p className="text-xs text-gray-500 mt-1">Gerencie o patrimônio atribuído ao colaborador.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Nome do Item</label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                required
                type="text"
                placeholder="Ex: MacBook Pro M2"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Categoria</label>
              <select
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as any})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Estado</label>
              <select
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value as any})}
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Número de Série / Patrimônio</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Ex: 82239-A"
                value={formData.serialNumber}
                onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
            Atribuir Equipamento
          </button>
        </form>
      </div>
    </div>
  );
}
