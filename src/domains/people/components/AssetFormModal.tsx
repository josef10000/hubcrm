import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Asset } from '@/types/people';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (asset: Partial<Asset>) => void;
  teamProfiles: any[];
  defaultUserId?: string;
}

export function AssetFormModal({ isOpen, onClose, onSubmit, teamProfiles, defaultUserId }: AssetFormModalProps) {
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    category: 'Hardware',
    status: 'Em uso',
    assignedTo: defaultUserId || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(newAsset);
    setNewAsset({ category: 'Hardware', status: 'Em uso', assignedTo: defaultUserId || '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1c1e] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-200 dark:border-white/10 scale-in-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
          <PlusCircle className="text-primary-500" /> Novo Ativo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Nome do Ativo</label>
            <input 
              type="text" 
              autoFocus
              required
              placeholder="Ex: Macbook Pro M1"
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
              value={newAsset.name || ''}
              onChange={e => setNewAsset({...newAsset, name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Número de Série (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ex: ABC123XYZ"
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
              value={newAsset.serialNumber || ''}
              onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Categoria</label>
              <select 
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                value={newAsset.category}
                onChange={e => setNewAsset({...newAsset, category: e.target.value as any})}
              >
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Acesso">Acesso</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Status</label>
              <select 
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                value={newAsset.status}
                onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
              >
                <option value="Em uso">Em uso</option>
                <option value="Devolvido">Devolvido</option>
                <option value="Manutenção">Manutenção</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Atribuir a</label>
            <select 
              required
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
              value={newAsset.assignedTo || ''}
              onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})}
            >
              <option value="">Selecione um colaborador</option>
              {teamProfiles.map(p => (
                <option key={p.uid} value={p.uid}>{p.displayName}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-200 dark:bg-white/5 text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-4 rounded-2xl font-bold bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
