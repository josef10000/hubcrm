import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Edit2, Plus, AlertTriangle, Calendar, Clock, Megaphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SaveButton } from '@/shared/components/SaveButton';

interface Announcement {
  id?: string;
  title: string;
  content: string;
  author: string;
  createdAt: number;
  expiresAt: number;
  urgent: boolean;
}

interface AnnouncementManagerProps {
  effectiveOrgId: string;
}

export default function AnnouncementManager({ effectiveOrgId }: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [daysActive, setDaysActive] = useState<number>(7); // Padrão de 7 dias ativos

  // 1. Ouvir comunicados do Firestore
  useEffect(() => {
    if (!effectiveOrgId) return;

    setLoading(true);
    const ref = collection(db, 'organizations', effectiveOrgId, 'announcements');
    const unsubscribe = onSnapshot(ref, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      // Ordenar por data de criação (mais recente primeiro)
      list.sort((a, b) => b.createdAt - a.createdAt);
      setAnnouncements(list);
      setLoading(false);
    }, (err) => {
      console.error('[AnnouncementManager] Erro ao ouvir comunicados:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // 2. Salvar ou Editar comunicado
  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !author.trim()) {
      throw new Error('Preencha todos os campos obrigatórios.');
    }

    const id = editingId || Date.now().toString(36) + Math.random().toString(36).substring(2);
    const createdAt = editingId 
      ? (announcements.find(a => a.id === editingId)?.createdAt || Date.now()) 
      : Date.now();
    
    const expiresAt = Date.now() + (daysActive * 24 * 60 * 60 * 1000);

    const ref = doc(db, 'organizations', effectiveOrgId, 'announcements', id);
    await setDoc(ref, {
      title: title.trim(),
      content: content.trim(),
      author: author.trim(),
      createdAt,
      expiresAt,
      urgent
    });

    // Pequeno atraso para a animação do botão ser percebida antes de limpar o formulário
    setTimeout(() => {
      resetForm();
    }, 1000);
  };

  // 3. Excluir comunicado
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este comunicado permanentemente?')) return;

    try {
      const ref = doc(db, 'organizations', effectiveOrgId, 'announcements', id);
      await deleteDoc(ref);
      toast.success('Comunicado removido!');
    } catch (err) {
      console.error('[AnnouncementManager] Erro ao excluir:', err);
      toast.error('Erro ao excluir comunicado.');
    }
  };

  // 4. Preencher formulário para editar
  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id || null);
    setTitle(ann.title);
    setContent(ann.content);
    setAuthor(ann.author);
    setUrgent(ann.urgent);
    
    // Calcular dias restantes aproximados para expiração
    const diffMs = ann.expiresAt - Date.now();
    const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
    setDaysActive(diffDays);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setAuthor('');
    setUrgent(false);
    setDaysActive(7);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary-500 mr-2" />
        <span className="text-sm text-gray-500">Carregando gerenciador de comunicados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Bloco de Formulário */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-left shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Megaphone className="mr-2 text-primary-500" size={20} />
          {editingId ? 'Editar Comunicado' : 'Publicar Novo Comunicado'}
        </h3>

        <form onSubmit={e => e.preventDefault()} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Título do Aviso</label>
              <input
                required
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm text-white"
                placeholder="Ex: [AVISO] Reunião Geral de Alinhamento"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Autor / Departamento</label>
              <input
                required
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm text-white"
                placeholder="Ex: RH / Diretoria / Comercial"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Conteúdo do Comunicado</label>
            <textarea
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-black/40 border border-white/10 rounded-xl resize-none text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all custom-scrollbar leading-relaxed"
              placeholder="Digite o texto detalhado do comunicado que será exibido no mural..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Tempo de Permanência (Dias)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="90"
                  value={daysActive}
                  onChange={e => setDaysActive(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl outline-none text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex flex-col justify-end pb-1.5">
                <span className="text-[10px] text-gray-500 font-medium">O aviso sairá do ar automaticamente após esse prazo.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-black/20 border border-white/5 p-3 rounded-2xl w-fit self-end">
              <input
                type="checkbox"
                id="urgent-check"
                checked={urgent}
                onChange={e => setUrgent(e.target.checked)}
                className="w-4 h-4 text-primary-500 border-white/10 rounded focus:ring-0 focus:ring-offset-0 bg-black"
              />
              <label htmlFor="urgent-check" className="text-xs font-bold text-white cursor-pointer select-none">
                Marcar como Urgente (Glow Neon de Destaque)
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <SaveButton
              onClick={handleSave}
              className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {editingId ? 'Salvar Alterações' : 'Publicar Comunicado'}
            </SaveButton>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Comunicados Cadastrados */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-left shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Comunicados Ativos & Histórico</h3>

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4">Nenhum comunicado cadastrado.</p>
          ) : (
            announcements.map((ann) => {
              const isExpired = Date.now() > ann.expiresAt;
              const createdDate = new Date(ann.createdAt).toLocaleDateString('pt-BR');
              const expiresDate = new Date(ann.expiresAt).toLocaleDateString('pt-BR');

              return (
                <div 
                  key={ann.id} 
                  className={`p-5 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ${
                    isExpired 
                      ? 'bg-zinc-950/20 border-white/5 opacity-55' 
                      : ann.urgent 
                        ? 'bg-amber-500/5 border-amber-500/20' 
                        : 'bg-white/[0.01] border-white/5'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        ann.urgent ? 'bg-amber-500/10 text-amber-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        {ann.author}
                      </span>
                      {ann.urgent && (
                        <span className="text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <AlertTriangle size={8} /> Urgente
                        </span>
                      )}
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        isExpired ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isExpired ? 'Expirado / Fora do Ar' : 'No Ar / Ativo'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-tight">{ann.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">{ann.content}</p>

                    <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        Criado: {createdDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Expira: {expiresDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleEdit(ann)}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 rounded-xl transition-all cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id!)}
                      className="p-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/25 text-red-400 rounded-xl transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
