import React, { useState } from 'react';
import { Tag as TagIcon, Plus, Trash2, X, Check, Palette } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Tag } from '@/types';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#22c55e', // green
  '#a855f7', // purple
  '#6b7280', // gray
];

export default function TagManager() {
  const { tags, effectiveOrgId } = useCRM();
  const { confirm } = useDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: PRESET_COLORS[0] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.name.trim() || !effectiveOrgId) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'tags'), {
        name: newTag.name.trim(),
        color: newTag.color,
        createdAt: Date.now()
      });
      setNewTag({ name: '', color: PRESET_COLORS[0] });
      setIsAdding(false);
      toast.success('Tag criada com sucesso!');
    } catch (e) {
      toast.error('Erro ao criar tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!effectiveOrgId) return;
    const ok = await confirm({
      title: 'Excluir Etiqueta',
      message: 'Tem certeza que deseja excluir esta tag? Ela será removida de todos os leads e clientes.',
      confirmText: 'Sim, excluir',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'tags', id));
      toast.success('Tag removida');
    } catch (e) {
      toast.error('Erro ao remover tag');
    }
  };

  return (
    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500">
            <TagIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans">Gerenciar Etiquetas (Tags)</h2>
            <p className="text-sm text-gray-500 font-sans">Personalize as tags para segmentar sua base.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold font-sans transition-all shadow-lg shadow-primary-500/20 active:scale-95"
        >
          <Plus size={18} />
          Nova Tag
        </button>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-white dark:bg-white/5 border border-primary-500/20 rounded-3xl animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Nome da Etiqueta</label>
              <input 
                type="text" 
                value={newTag.name}
                onChange={e => setNewTag({...newTag, name: e.target.value})}
                placeholder="Ex: VIP, Lead Quente, Churn..."
                className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-sans"
              />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                 <Palette size={12} /> Selecione uma Cor
               </label>
               <div className="flex flex-wrap gap-2">
                 {PRESET_COLORS.map(color => (
                   <button
                     key={color}
                     onClick={() => setNewTag({...newTag, color})}
                     className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${newTag.color === color ? 'border-primary-500 scale-110 ring-2 ring-primary-500/20' : 'border-transparent'}`}
                     style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all font-sans"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAddTag}
              disabled={isSubmitting}
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold font-sans transition-all flex items-center gap-2 shadow-xl shadow-primary-500/20"
            >
              {isSubmitting ? 'Salvando...' : 'Gravar Tag'}
              {!isSubmitting && <Check size={18} />}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-white/5 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-white/10">
            <TagIcon size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-sans italic">Nenhuma tag cadastrada ainda.</p>
          </div>
        ) : (
          tags.map(tag => (
            <div key={tag.id} className="group relative bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-3xl hover:border-primary-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="font-bold text-gray-900 dark:text-white font-sans">{tag.name}</span>
              </div>
              <button 
                onClick={() => handleDeleteTag(tag.id)}
                className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
