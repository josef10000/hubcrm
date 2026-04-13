import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Download, ExternalLink, Calendar, PlusCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { UserDocument } from '../../types/people';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DocumentManagerProps {
  userId: string;
}

export default function DocumentManager({ userId }: DocumentManagerProps) {
  const { effectiveOrgId } = useCRM();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<UserDocument>>({
    type: 'Certificado'
  });

  useEffect(() => {
    if (!effectiveOrgId || !userId) return;
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'documents'),
      where('userId', '==', userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserDocument));
      setDocuments(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [effectiveOrgId, userId]);

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name || !newDoc.url) return;
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'documents'), {
        ...newDoc,
        userId,
        uploadedAt: Date.now(),
        orgId: effectiveOrgId
      });
      setShowAddForm(false);
      setNewDoc({ type: 'Certificado' });
      toast.success('Documento registrado!');
    } catch (error) {
      toast.error('Erro ao salvar documento.');
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'documents', id));
      toast.success('Documento removido.');
    } catch (error) {
      toast.error('Erro ao remover documento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Gestor de Documentos Privados
        </h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-primary-500 hover:text-primary-600 transition-all flex items-center gap-1 text-sm font-bold"
        >
          <PlusCircle size={18} /> Novo Documento
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddDoc} className="bg-gray-100/50 dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 animate-in slide-in-from-top mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Nome do Documento</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Contrato de Trabalho"
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newDoc.name || ''}
                onChange={e => setNewDoc({...newDoc, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Link do Arquivo (URL)</label>
              <input 
                type="url" 
                required
                placeholder="https://drive.google.com/..."
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newDoc.url || ''}
                onChange={e => setNewDoc({...newDoc, url: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Tipo</label>
              <select 
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                value={newDoc.type}
                onChange={e => setNewDoc({...newDoc, type: e.target.value as any})}
              >
                <option value="Contrato">Contrato</option>
                <option value="Certificado">Certificado</option>
                <option value="Identidade">Identidade</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20">Registrar Documento</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-500 px-4 py-2 text-xs font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl transition-all hover:border-primary-500 group">
            <div className={`p-3 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 group-hover:text-primary-500 transition-all`}>
              <FileText size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-sm truncate dark:text-white">{doc.name}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Calendar size={10} /> {format(doc.uploadedAt, 'dd/MM/yyyy')} • {doc.type}
              </p>
            </div>
            <div className="flex items-center gap-1 h-full">
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                title="Abrir Documento"
              >
                <ExternalLink size={16} />
              </a>
              <button 
                onClick={() => handleDeleteDoc(doc.id)} 
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {documents.length === 0 && !loading && (
          <div className="col-span-full py-10 text-center opacity-40">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum documento anexado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
