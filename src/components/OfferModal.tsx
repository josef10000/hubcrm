import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Offer } from '../types';

export default function OfferModal({ isOpen, onClose, onSave, onDelete, initialData }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Offer>) => void, onDelete?: (id: string) => void, initialData: Partial<Offer> | null }) {
  const [formData, setFormData] = useState<Partial<Offer>>({
    name: '',
    type: 'SUBSCRIPTION',
    price: 0,
    setupPrice: 0,
    maxInstallments: 12,
    active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        type: 'SUBSCRIPTION',
        price: 0,
        setupPrice: 0,
        maxInstallments: 12,
        active: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initialData?.id ? 'Editar Oferta' : 'Nova Oferta'}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome da Oferta *</label>
              <input 
                type="text" 
                name="name" 
                required
                value={formData.name || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                placeholder="Ex: Plano Essencial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo *</label>
              <select 
                name="type" 
                value={formData.type || 'SUBSCRIPTION'} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              >
                <option value="SUBSCRIPTION">Assinatura (Recorrente)</option>
                <option value="SINGLE">Pagamento Único</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Preço do Plano/Oferta (R$) *</label>
              <input 
                type="number" 
                name="price" 
                required
                min="0"
                step="0.01"
                value={formData.price || 0} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
              />
            </div>

            {formData.type === 'SUBSCRIPTION' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Taxa de Setup (R$)</label>
                <input 
                  type="number" 
                  name="setupPrice" 
                  min="0"
                  step="0.01"
                  value={formData.setupPrice || 0} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
                <p className="text-xs text-gray-500 mt-1">Deixe 0 se for apenas assinatura sem setup.</p>
              </div>
            )}

            {formData.type === 'SINGLE' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Máximo de Parcelas</label>
                <input 
                  type="number" 
                  name="maxInstallments" 
                  min="1"
                  max="12"
                  value={formData.maxInstallments || 12} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
                <p className="text-xs text-gray-500 mt-1">O cliente poderá parcelar o pagamento único em até {formData.maxInstallments || 12} vezes.</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <input 
                type="checkbox" 
                id="active"
                name="active" 
                checked={formData.active !== undefined ? formData.active : true} 
                onChange={handleChange} 
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500 bg-black/20"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Oferta Ativa (Visível na criação de clientes)
              </label>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
            {initialData?.id && onDelete ? (
              <button 
                type="button" 
                onClick={() => { onDelete(initialData.id!); onClose(); }} 
                className="text-red-500 hover:text-red-600 font-medium px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                Excluir
              </button>
            ) : <div></div>}
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Cancelar</button>
              <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white font-medium shadow-lg shadow-primary-500/30 transition-all hover:scale-105 active:scale-95">Salvar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
