import React, { useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { GripVertical, Plus, Target, Loader, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PDIItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  createdAt: number;
}

interface PDIKanbanProps {
  items: PDIItem[];
  orgId: string;
  userId: string;
}

const COLUMNS: { key: PDIItem['status']; label: string; color: string; dotColor: string }[] = [
  { key: 'todo',  label: 'A Fazer',     color: 'border-gray-500/30',   dotColor: 'bg-gray-500' },
  { key: 'doing', label: 'Em Progresso', color: 'border-blue-500/30',   dotColor: 'bg-blue-400 animate-pulse' },
  { key: 'done',  label: 'Concluído',    color: 'border-emerald-500/30', dotColor: 'bg-emerald-400' },
];

export function PDIKanban({ items = [], orgId, userId }: PDIKanbanProps) {
  const { user } = useAuth();
  const [dragging, setDragging] = useState<PDIItem | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const userDocRef = doc(db, 'profiles', userId);

  const moveItem = useCallback(async (item: PDIItem, newStatus: PDIItem['status']) => {
    if (item.status === newStatus) return;
    setLoading(true);
    const updatedItems = items.map(i => i.id === item.id ? { ...i, status: newStatus } : i);
    try {
      await updateDoc(userDocRef, {
        pdiItems: updatedItems,
      });
    } catch {
      toast.error('Erro ao mover item do PDI');
    } finally {
      setLoading(false);
    }
  }, [userDocRef, items]);

  const addItem = async () => {
    if (!newTitle.trim()) return;
    const item: PDIItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      status: 'todo',
      createdAt: Date.now(),
    };
    setLoading(true);
    try {
      await updateDoc(userDocRef, { 
        pdiItems: [...items, item] 
      });
      setNewTitle('');
      setAdding(false);
      toast.success('Item de PDI adicionado!');
    } catch {
      toast.error('Erro ao adicionar item.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    setLoading(true);
    const updatedItems = items.filter(i => i.id !== itemId);
    try {
      await updateDoc(userDocRef, {
        pdiItems: updatedItems,
      });
      toast.success('Objetivo removido!');
    } catch {
      toast.error('Erro ao remover objetivo.');
    } finally {
      setLoading(false);
    }
  };

  const updateItemTitle = async (itemId: string, newText: string) => {
    if (!newText.trim()) return;
    setLoading(true);
    const updatedItems = items.map(i => i.id === itemId ? { ...i, title: newText.trim() } : i);
    try {
      await updateDoc(userDocRef, {
        pdiItems: updatedItems,
      });
      toast.success('Objetivo atualizado!');
    } catch {
      toast.error('Erro ao atualizar objetivo.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (item: PDIItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleEditSave = async (item: PDIItem) => {
    if (editTitle.trim() === item.title) {
      setEditingId(null);
      return;
    }
    await updateItemTitle(item.id, editTitle);
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary-400" />
          <h3 className="font-bold text-white text-sm">Meu PDI — Plano de Desenvolvimento</h3>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-400 text-xs font-bold rounded-xl transition-all"
        >
          <Plus size={12} /> Novo Objetivo
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Ex: Concluir curso de TypeScript..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          <button onClick={addItem} disabled={loading} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">
            {loading ? <Loader size={12} className="animate-spin" /> : 'Adicionar'}
          </button>
          <button onClick={() => setAdding(false)} className="px-3 py-2 bg-white/5 border border-white/10 text-gray-400 text-xs rounded-xl">
            Cancelar
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          return (
            <div
              key={col.key}
              className={`min-h-[160px] bg-white/[0.02] border ${col.color} rounded-2xl p-3`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragging && moveItem(dragging, col.key)}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{col.label}</span>
                <span className="ml-auto text-[10px] text-gray-600">{colItems.length}</span>
              </div>
              <div className="space-y-2">
                {colItems.map(item => (
                  <div
                    key={item.id}
                    draggable={editingId !== item.id}
                    onDragStart={() => setDragging(item)}
                    onDragEnd={() => setDragging(null)}
                    className={`p-2.5 bg-white/5 border border-white/10 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/10 transition-all group flex items-start gap-1.5 justify-between ${dragging?.id === item.id ? 'opacity-40 scale-95' : ''}`}
                  >
                    <div className="flex items-start gap-1.5 flex-1 min-w-0">
                      <GripVertical size={12} className="text-gray-600 mt-0.5 group-hover:text-gray-400 shrink-0" />
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onBlur={() => handleEditSave(item)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(item);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-1.5 py-0.5 bg-white/10 border border-primary-500/50 rounded text-xs text-white outline-none"
                        />
                      ) : (
                        <p 
                          onDoubleClick={() => startEditing(item)}
                          title="Duplo clique para editar"
                          className="text-xs text-white font-medium leading-relaxed truncate flex-1 cursor-text"
                        >
                          {item.title}
                        </p>
                      )}
                    </div>
                    {editingId !== item.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                          title="Editar objetivo"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="Excluir objetivo"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {colItems.length === 0 && (
                  <p className="text-[10px] text-gray-700 text-center mt-4 italic">Arraste aqui</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

