import React, { useState, useEffect } from 'react';
import { Rocket, Edit2, Trash2, Plus, Search, Video, FileText, Link as LinkIcon, FileCode, X, Loader2, Filter } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { GrowthAsset, GrowthAssetType } from '@/types';
import { toast } from 'sonner';

export default function GrowthHubView() {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { effectiveOrgId } = useCRM();

  const [assets, setAssets] = useState<GrowthAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  // Estado para Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<GrowthAsset | null>(null);
  
  const [formData, setFormData] = useState<Partial<GrowthAsset>>({
    title: '',
    type: 'video',
    url: '',
    content: '',
    category: ''
  });

  // Permissão de escrita
  const canManage = hasPermission('MANAGE_CLIENTS') || hasPermission('MANAGE_SETTINGS');

  // Categorias únicas extraídas dos ativos existentes para o filtro
  const categories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

  // Carregar dados em tempo real
  useEffect(() => {
    if (!effectiveOrgId) return;

    setLoading(true);
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'growth_assets'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedAssets: GrowthAsset[] = [];
      snapshot.forEach((doc) => {
        loadedAssets.push({
          id: doc.id,
          ...doc.data()
        } as GrowthAsset);
      });
      setAssets(loadedAssets);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao escutar ativos do Hub de Crescimento:', error);
      toast.error('Erro ao carregar dados do Hub de Crescimento.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  const handleOpenCreateModal = () => {
    setEditingAsset(null);
    setFormData({
      title: '',
      type: 'video',
      url: '',
      content: '',
      category: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: GrowthAsset) => {
    setEditingAsset(asset);
    setFormData({
      title: asset.title,
      type: asset.type,
      url: asset.url,
      content: asset.content || '',
      category: asset.category
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) return;

    if (!formData.title?.trim() || !formData.type || !formData.category?.trim()) {
      toast.error('Preencha os campos obrigatórios (Título, Tipo e Categoria).');
      return;
    }

    if (formData.type !== 'script' && !formData.url?.trim()) {
      toast.error('O link URL é obrigatório para este tipo de ativo.');
      return;
    }

    // Validação de URL
    if (formData.url && !formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      toast.error('A URL deve começar com http:// ou https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const colRef = collection(db, 'organizations', effectiveOrgId, 'growth_assets');
      
      const payload = {
        title: formData.title.trim(),
        type: formData.type,
        url: formData.url?.trim() || '',
        category: formData.category.trim(),
        content: formData.type === 'script' ? (formData.content?.trim() || '') : '',
        updatedAt: Date.now()
      };

      if (editingAsset) {
        // Atualização
        const docRef = doc(db, 'organizations', effectiveOrgId, 'growth_assets', editingAsset.id);
        await updateDoc(docRef, payload);
        toast.success('Ativo atualizado com sucesso!');
      } else {
        // Criação
        await addDoc(colRef, {
          ...payload,
          createdAt: Date.now()
        });
        toast.success('Ativo criado com sucesso!');
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar ativo:', error);
      toast.error(`Falha ao salvar ativo: ${error.message || 'Erro interno'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!effectiveOrgId) return;

    const ok = window.confirm('Deseja realmente remover este ativo do Hub de Crescimento? Esta ação não pode ser desfeita.');
    if (!ok) return;

    try {
      const docRef = doc(db, 'organizations', effectiveOrgId, 'growth_assets', assetId);
      await deleteDoc(docRef);
      toast.success('Ativo removido com sucesso.');
    } catch (error: any) {
      console.error('Erro ao deletar ativo:', error);
      toast.error('Falha ao remover ativo.');
    }
  };

  // Filtragem local
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (asset.content && asset.content.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedTypeFilter === 'all' || asset.type === selectedTypeFilter;
    const matchesCategory = selectedCategoryFilter === 'all' || asset.category === selectedCategoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const getAssetTypeIcon = (type: GrowthAssetType) => {
    switch (type) {
      case 'video':
        return <Video size={16} className="text-red-400" />;
      case 'pdf':
        return <FileText size={16} className="text-emerald-400" />;
      case 'script':
        return <FileCode size={16} className="text-yellow-400" />;
      case 'template':
        return <LinkIcon size={16} className="text-cyan-400" />;
    }
  };

  const getAssetTypeLabel = (type: GrowthAssetType) => {
    switch (type) {
      case 'video': return 'Vídeo de Treinamento';
      case 'pdf': return 'PDF / Documento';
      case 'script': return 'Script de Vendas';
      case 'template': return 'Template / Canva';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-primary-400">
              <Rocket size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hub de Crescimento (Ativos Globais)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg leading-relaxed">
                Área de Sucesso do Cliente. Cadastre e gerencie os conteúdos globais (vídeos, PDFs, scripts de vendas e templates) que serão disponibilizados no portal de todos os clientes.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary-500/25 shrink-0 self-start md:self-center hover:scale-105 active:scale-95"
            >
              <Plus size={16} />
              Adicionar Ativo
            </button>
          )}
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          {/* Busca */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por título, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs placeholder-gray-500 transition-all"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Filtrar:</span>
            </div>
            
            {/* Tipo */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs cursor-pointer appearance-none"
            >
              <option value="all" className="bg-gray-200 dark:bg-zinc-950">Todos os tipos</option>
              <option value="video" className="bg-gray-200 dark:bg-zinc-950">Vídeos</option>
              <option value="pdf" className="bg-gray-200 dark:bg-zinc-950">PDFs</option>
              <option value="script" className="bg-gray-200 dark:bg-zinc-950">Scripts</option>
              <option value="template" className="bg-gray-200 dark:bg-zinc-950">Templates</option>
            </select>

            {/* Categorias */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs cursor-pointer appearance-none"
            >
              <option value="all" className="bg-gray-200 dark:bg-zinc-950">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-gray-200 dark:bg-zinc-950">{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Listagem Grid / Cards */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="flex flex-col bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:border-primary-500/50 shadow-md transition-all group hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary-500/20 bg-primary-500/5 text-primary-400">
                    {asset.category}
                  </span>
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                    {getAssetTypeIcon(asset.type)}
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                      {getAssetTypeLabel(asset.type)}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2 truncate group-hover:text-primary-400 transition-colors">
                  {asset.title}
                </h4>

                {asset.type === 'script' ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed bg-black/10 p-2.5 rounded-lg border border-white/5 font-mono">
                    {asset.content || 'Sem conteúdo cadastrado.'}
                  </p>
                ) : (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-400 hover:underline truncate mb-4 flex items-center gap-1.5 bg-black/10 p-2.5 rounded-lg border border-white/5"
                  >
                    <LinkIcon size={12} className="shrink-0" />
                    {asset.url}
                  </a>
                )}

                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('pt-BR') : 'Data Indisponível'}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="p-1.5 text-gray-500 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                        title="Editar Ativo"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remover Ativo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-black/10 border border-gray-200 dark:border-white/10 rounded-3xl">
            <p className="text-sm text-gray-500">Nenhum ativo do Hub de Crescimento foi localizado com os filtros selecionados.</p>
          </div>
        )}

      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="bg-gray-200 dark:bg-zinc-900 border border-gray-300 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingAsset ? 'Editar Ativo Global' : 'Adicionar Ativo Global'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Título do Ativo *</label>
                <input
                  required
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Guia de Abordagem Comercial"
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoria / Grupo *</label>
                <input
                  required
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Onboarding, Vendas, Suporte"
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              {/* Tipo de Ativo */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tipo do Ativo *</label>
                <select
                  value={formData.type || 'video'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as GrowthAssetType })}
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value="video" className="bg-gray-200 dark:bg-zinc-950">Vídeo (Youtube / Vimeo)</option>
                  <option value="pdf" className="bg-gray-200 dark:bg-zinc-950">PDF / Link do Drive</option>
                  <option value="script" className="bg-gray-200 dark:bg-zinc-950">Script de Vendas (Texto)</option>
                  <option value="template" className="bg-gray-200 dark:bg-zinc-950">Template / Link Geral Canva</option>
                </select>
              </div>

              {/* URL (para tudo menos script) */}
              {formData.type !== 'script' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Link URL *</label>
                  <input
                    required
                    type="url"
                    value={formData.url || ''}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              )}

              {/* Conteúdo de Texto (apenas para Script) */}
              {formData.type === 'script' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Texto do Script *</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escreva aqui a estrutura do script comercial..."
                    className="w-full px-4 py-3 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
