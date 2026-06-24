import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Edit2, 
  Trash2, 
  Plus, 
  Search, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  FileCode, 
  X, 
  Loader2, 
  Filter, 
  BookOpen, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Image as ImageIcon, 
  Globe, 
  Check, 
  ThumbsUp, 
  Eye, 
  Sparkles,
  ChevronRight,
  Upload
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { GrowthAsset, GrowthAssetType, BlogPost, ArticleBlock } from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

export default function GrowthHubView() {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { effectiveOrgId } = useCRM();

  // Abas principais
  const [activeSubTab, setActiveSubTab] = useState<'assets' | 'insights'>('assets');

  // Estados dos Ativos de Sucesso (Globais)
  const [assets, setAssets] = useState<GrowthAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isAssetSubmitting, setIsAssetSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<GrowthAsset | null>(null);
  const [assetFormData, setAssetFormData] = useState<Partial<GrowthAsset>>({
    title: '',
    type: 'video',
    url: '',
    content: '',
    category: ''
  });

  // Estados dos Artigos (Dicas & Insights)
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [searchTermPosts, setSearchTermPosts] = useState('');
  const [selectedCategoryFilterPosts, setSelectedCategoryFilterPosts] = useState<string>('all');
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isPostSubmitting, setIsPostSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postFormData, setPostFormData] = useState<{
    id: string;
    title: string;
    excerpt: string;
    category: 'Gestão' | 'Vendas' | 'Finanças' | 'Marketing' | 'Geral';
    imageUrl: string;
    readTime: string;
    authorName: string;
    authorRole: string;
    authorAvatarUrl: string;
    blocks: ArticleBlock[];
    status: 'draft' | 'published';
  }>({
    id: '',
    title: '',
    excerpt: '',
    category: 'Geral',
    imageUrl: '',
    readTime: '',
    authorName: '',
    authorRole: '',
    authorAvatarUrl: '',
    blocks: [],
    status: 'draft'
  });

  // Permissão de escrita (Admin/Dono)
  const canManage = hasPermission('MANAGE_CLIENTS') || hasPermission('MANAGE_SETTINGS');

  // Categorias únicas extraídas dos ativos para o filtro
  const categories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));
  const postCategories = ['Gestão', 'Vendas', 'Finanças', 'Marketing', 'Geral'];

  // Helper para formatar slug
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Substitui espaços por -
      .replace(/[^\w\-]+/g, '')       // Remove caracteres especiais
      .replace(/\-\-+/g, '-')         // Substitui múltiplos - por um único -
      .replace(/^-+/, '')             // Remove - do início
      .replace(/-+$/, '');            // Remove - do fim
  };

  // 1. Carregar Ativos em tempo real
  useEffect(() => {
    if (!effectiveOrgId) return;

    setAssetsLoading(true);
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
      setAssetsLoading(false);
    }, (error) => {
      console.error('Erro ao carregar ativos de crescimento:', error);
      toast.error('Erro ao carregar dados dos ativos de sucesso.');
      setAssetsLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // 2. Carregar Artigos (Blog Posts) em tempo real
  useEffect(() => {
    setPostsLoading(true);
    const q = query(
      collection(db, 'blog_posts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPosts: BlogPost[] = [];
      snapshot.forEach((doc) => {
        loadedPosts.push({
          id: doc.id,
          ...doc.data()
        } as BlogPost);
      });
      setPosts(loadedPosts);
      setPostsLoading(false);
    }, (error) => {
      console.error('Erro ao carregar artigos globais:', error);
      toast.error('Erro ao carregar os artigos de Dicas & Insights. Verifique se o deploy das regras do Firestore foi concluído no GitHub.');
      setPostsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Lógica dos Ativos de Sucesso (Aba 1)
  // ────────────────────────────────────────────────────────────────────────────
  const handleOpenCreateAssetModal = () => {
    setEditingAsset(null);
    setAssetFormData({
      title: '',
      type: 'video',
      url: '',
      content: '',
      category: ''
    });
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAssetModal = (asset: GrowthAsset) => {
    setEditingAsset(asset);
    setAssetFormData({
      title: asset.title,
      type: asset.type,
      url: asset.url,
      content: asset.content || '',
      category: asset.category
    });
    setIsAssetModalOpen(true);
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) return;

    if (!assetFormData.title?.trim() || !assetFormData.type || !assetFormData.category?.trim()) {
      toast.error('Preencha os campos obrigatórios (Título, Tipo e Categoria).');
      return;
    }

    if (assetFormData.type !== 'script' && !assetFormData.url?.trim()) {
      toast.error('O link URL é obrigatório para este tipo de ativo.');
      return;
    }

    if (assetFormData.url && !assetFormData.url.startsWith('http://') && !assetFormData.url.startsWith('https://')) {
      toast.error('A URL deve começar com http:// ou https://');
      return;
    }

    setIsAssetSubmitting(true);
    try {
      const colRef = collection(db, 'organizations', effectiveOrgId, 'growth_assets');
      
      const payload = {
        title: assetFormData.title.trim(),
        type: assetFormData.type,
        url: assetFormData.url?.trim() || '',
        category: assetFormData.category.trim(),
        content: assetFormData.type === 'script' ? (assetFormData.content?.trim() || '') : '',
        updatedAt: Date.now()
      };

      if (editingAsset) {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'growth_assets', editingAsset.id);
        await updateDoc(docRef, payload);
        toast.success('Ativo de sucesso atualizado com sucesso!');
      } else {
        await addDoc(colRef, {
          ...payload,
          createdAt: Date.now()
        });
        toast.success('Ativo de sucesso criado com sucesso!');
      }

      setIsAssetModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar ativo:', error);
      toast.error(`Falha ao salvar ativo: ${error.message || 'Erro interno'}`);
    } finally {
      setIsAssetSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!effectiveOrgId) return;

    const ok = window.confirm('Deseja realmente remover este ativo do Hub de Crescimento? Esta ação não pode ser desfeita.');
    if (!ok) return;

    try {
      const docRef = doc(db, 'organizations', effectiveOrgId, 'growth_assets', assetId);
      await deleteDoc(docRef);
      toast.success('Ativo de sucesso removido com sucesso.');
    } catch (error: any) {
      console.error('Erro ao deletar ativo:', error);
      toast.error('Falha ao remover ativo.');
    }
  };

  // Filtragem de Ativos
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || asset.type === selectedTypeFilter;
    const matchesCategory = selectedCategoryFilter === 'all' || asset.category === selectedCategoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Lógica de Dicas & Insights / Artigos (Aba 2)
  // ────────────────────────────────────────────────────────────────────────────
  const handleOpenCreatePostModal = () => {
    setEditingPost(null);
    setPostFormData({
      id: '',
      title: '',
      excerpt: '',
      category: 'Geral',
      imageUrl: '',
      readTime: '4 min',
      authorName: userProfile?.displayName || '',
      authorRole: userProfile?.jobTitle || 'Consultoria de Crescimento',
      authorAvatarUrl: userProfile?.photoURL || 'https://i.imgur.com/zCvL7xy.png',
      blocks: [
        { type: 'paragraph', text: '' }
      ],
      status: 'published'
    });
    setIsPostOpen(true);
  };

  const handleOpenEditPostModal = (post: BlogPost) => {
    setEditingPost(post);
    setPostFormData({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      imageUrl: post.imageUrl || '',
      readTime: post.readTime || '4 min',
      authorName: post.author.name || '',
      authorRole: post.author.role || '',
      authorAvatarUrl: post.author.avatarUrl || '',
      blocks: post.blocks && post.blocks.length > 0 ? [...post.blocks] : [{ type: 'paragraph', text: '' }],
      status: post.status || 'published'
    });
    setIsPostOpen(true);
  };

  // Upload da Imagem de Capa do Artigo via Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Enviando imagem de capa para o Cloudinary...');
    try {
      const secureUrl = await uploadToCloudinary(file);
      setPostFormData(prev => ({
        ...prev,
        imageUrl: secureUrl
      }));
      toast.success('Imagem de capa carregada com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Erro no upload da capa:', error);
      toast.error(`Falha no upload: ${error.message || 'Erro ao enviar'}`, { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postFormData.title?.trim() || !postFormData.excerpt?.trim() || !postFormData.imageUrl?.trim()) {
      toast.error('Preencha os campos obrigatórios (Título, Resumo e Imagem de Capa).');
      return;
    }

    if (postFormData.blocks.length === 0) {
      toast.error('Adicione pelo menos um bloco de conteúdo ao artigo.');
      return;
    }

    // Validar se blocos de texto estão preenchidos
    for (let i = 0; i < postFormData.blocks.length; i++) {
      const block = postFormData.blocks[i];
      if (block.type !== 'cta' && !block.text?.trim()) {
        toast.error(`O bloco #${i + 1} (${getFriendlyBlockType(block.type)}) está vazio.`);
        return;
      }
      if (block.type === 'cta' && (!block.ctaText?.trim() || !block.ctaAction)) {
        toast.error(`O bloco CTA #${i + 1} precisa de texto no botão e ação configurada.`);
        return;
      }
    }

    setIsPostSubmitting(true);
    try {
      const slug = editingPost ? editingPost.id : slugify(postFormData.title);
      
      if (!editingPost) {
        // Verificar se já existe um post com esse slug
        const docRefTest = doc(db, 'blog_posts', slug);
        const docSnap = await getDoc(docRefTest);
        if (docSnap.exists()) {
          toast.error('Já existe um artigo publicado com esse título. Altere um pouco o título.');
          setIsPostSubmitting(false);
          return;
        }
      }

      // Helper para limpar propriedades undefined recursivamente para o Firestore
      const cleanUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => cleanUndefined(item));
        } else if (obj !== null && typeof obj === 'object') {
          const cleaned: any = {};
          for (const key of Object.keys(obj)) {
            if (obj[key] !== undefined) {
              cleaned[key] = cleanUndefined(obj[key]);
            }
          }
          return cleaned;
        }
        return obj;
      };

      const payload = cleanUndefined({
        title: postFormData.title.trim(),
        excerpt: postFormData.excerpt.trim(),
        category: postFormData.category,
        imageUrl: postFormData.imageUrl.trim(),
        readTime: postFormData.readTime.trim(),
        publishedAt: editingPost 
          ? (editingPost.publishedAt || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }))
          : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
        likes: editingPost ? (editingPost.likes || 0) : 0,
        views: editingPost ? (editingPost.views || 0) : 0,
        author: {
          name: postFormData.authorName.trim(),
          role: postFormData.authorRole.trim(),
          avatarUrl: postFormData.authorAvatarUrl.trim()
        },
        blocks: postFormData.blocks,
        status: postFormData.status,
        createdAt: editingPost ? (editingPost.createdAt || Date.now()) : Date.now()
      });

      const finalDocRef = doc(db, 'blog_posts', slug);
      await setDoc(finalDocRef, payload);
      toast.success(editingPost ? 'Artigo atualizado com sucesso!' : 'Artigo publicado com sucesso!');
      setIsPostOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar artigo:', error);
      toast.error(`Falha ao salvar artigo: ${error.message || 'Erro interno'}`);
    } finally {
      setIsPostSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const ok = window.confirm('Deseja realmente remover este artigo do portal dos clientes? Esta ação é irreversível.');
    if (!ok) return;

    try {
      const docRef = doc(db, 'blog_posts', postId);
      await deleteDoc(docRef);
      toast.success('Artigo removido com sucesso.');
    } catch (error: any) {
      console.error('Erro ao deletar artigo:', error);
      toast.error('Falha ao remover artigo.');
    }
  };

  // Blocos dinâmicos do post
  const addBlock = (type: 'paragraph' | 'heading' | 'quote' | 'cta') => {
    setPostFormData(prev => ({
      ...prev,
      blocks: [
        ...prev.blocks,
        {
          type,
          text: '',
          ctaText: type === 'cta' ? 'Acessar' : undefined,
          ctaAction: type === 'cta' ? 'home' : undefined
        }
      ]
    }));
  };

  const updateBlock = (idx: number, field: keyof ArticleBlock, value: string) => {
    setPostFormData(prev => {
      const newBlocks = [...prev.blocks];
      newBlocks[idx] = {
        ...newBlocks[idx],
        [field]: value
      };
      return { ...prev, blocks: newBlocks };
    });
  };

  const removeBlock = (idx: number) => {
    if (postFormData.blocks.length === 1) {
      toast.error('O artigo deve ter pelo menos um bloco.');
      return;
    }
    setPostFormData(prev => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== idx)
    }));
  };

  const moveBlock = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= postFormData.blocks.length) return;

    setPostFormData(prev => {
      const newBlocks = [...prev.blocks];
      const temp = newBlocks[idx];
      newBlocks[idx] = newBlocks[targetIdx];
      newBlocks[targetIdx] = temp;
      return { ...prev, blocks: newBlocks };
    });
  };

  // Filtragem de Posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTermPosts.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchTermPosts.toLowerCase());
    const matchesCategory = selectedCategoryFilterPosts === 'all' || post.category === selectedCategoryFilterPosts;
    return matchesSearch && matchesCategory;
  });

  const getFriendlyBlockType = (type: string) => {
    switch (type) {
      case 'paragraph': return 'Parágrafo';
      case 'heading': return 'Subtítulo';
      case 'quote': return 'Citação';
      case 'cta': return 'Botão de Ação (CTA)';
      default: return type;
    }
  };

  const getFriendlyCtaLabel = (action: string) => {
    switch (action) {
      case 'home': return 'Início / Dashboard';
      case 'agenda_settings': return 'Agenda (Configuração Pix)';
      case 'management': return 'Meu Negócio (Calculadora/Insumos)';
      case 'finance': return 'Financeiro (Faturas)';
      case 'services': return 'Serviços / Projetos';
      case 'docs': return 'Contratos / Assinaturas';
      case 'support': return 'Suporte / Chamados';
      case 'profile': return 'Minha Conta / Perfil';
      default: return action;
    }
  };

  // Elementos estéticos de auxílio
  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'Vendas': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'Finanças': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'Marketing': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'Gestão': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hub de Crescimento (Backoffice)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg leading-relaxed">
                Área de Sucesso do Cliente. Cadastre conteúdos globais (artigos dinâmicos, vídeos, PDFs, scripts de vendas e templates) para impulsionar a performance dos seus clientes no portal.
              </p>
            </div>
          </div>
          
          {canManage && (
            <div>
              {activeSubTab === 'assets' ? (
                <button
                  onClick={handleOpenCreateAssetModal}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary-500/25 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  Adicionar Ativo
                </button>
              ) : (
                <button
                  onClick={handleOpenCreatePostModal}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#f97316] to-[#f97316]/80 hover:from-[#ea580c] hover:to-[#ea580c] text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#f97316]/25 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  Escrever Artigo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Seleção de Sub-abas */}
        <div className="flex bg-black/35 backdrop-blur-md p-1 border border-white/5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('assets')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'assets'
                ? 'bg-primary-500 text-gray-900 dark:text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Rocket size={14} />
            Ativos de Sucesso
          </button>
          <button
            onClick={() => setActiveSubTab('insights')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'insights'
                ? 'bg-primary-500 text-gray-900 dark:text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            Dicas & Insights (Blog)
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: Ativos de Sucesso */}
        {activeSubTab === 'assets' && (
          <div className="space-y-6">
            {/* Barra de Filtros e Busca de Ativos */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar ativos de sucesso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs placeholder-gray-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Filtrar:</span>
                </div>
                
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

            {/* Listagem */}
            {assetsLoading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : filteredAssets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
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

                    <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2 truncate group-hover:text-primary-400 transition-colors text-left">
                      {asset.title}
                    </h4>

                    {asset.type === 'script' ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed bg-black/10 p-2.5 rounded-lg border border-white/5 font-mono text-left">
                        {asset.content || 'Sem conteúdo cadastrado.'}
                      </p>
                    ) : (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-400 hover:underline truncate mb-4 flex items-center gap-1.5 bg-black/10 p-2.5 rounded-lg border border-white/5 text-left"
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
                            onClick={() => handleOpenEditAssetModal(asset)}
                            className="p-1.5 text-gray-500 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Editar Ativo"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
              <div className="text-center py-20 bg-black/10 border border-gray-200 dark:border-white/10 rounded-3xl animate-in fade-in duration-300">
                <p className="text-sm text-gray-500">Nenhum ativo do Hub de Crescimento foi localizado.</p>
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: Dicas & Insights */}
        {activeSubTab === 'insights' && (
          <div className="space-y-6">
            {/* Barra de Filtros e Busca de Posts */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar artigos por título..."
                  value={searchTermPosts}
                  onChange={(e) => setSearchTermPosts(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs placeholder-gray-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Filtrar Categoria:</span>
                </div>
                
                <select
                  value={selectedCategoryFilterPosts}
                  onChange={(e) => setSelectedCategoryFilterPosts(e.target.value)}
                  className="px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs cursor-pointer appearance-none font-medium"
                >
                  <option value="all" className="bg-gray-200 dark:bg-zinc-950">Todas</option>
                  <option value="Gestão" className="bg-gray-200 dark:bg-zinc-950">Gestão</option>
                  <option value="Vendas" className="bg-gray-200 dark:bg-zinc-950">Vendas</option>
                  <option value="Finanças" className="bg-gray-200 dark:bg-zinc-950">Finanças</option>
                  <option value="Marketing" className="bg-gray-200 dark:bg-zinc-950">Marketing</option>
                  <option value="Geral" className="bg-gray-200 dark:bg-zinc-950">Geral</option>
                </select>
              </div>
            </div>

            {/* Listagem Grid de Artigos */}
            {postsLoading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                {filteredPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="flex flex-col md:flex-row bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-lg hover:border-[#f97316]/40 transition-all group"
                  >
                    {/* Capa */}
                    <div className="w-full md:w-40 aspect-video md:aspect-auto min-h-[140px] relative overflow-hidden bg-black/30 shrink-0">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-3 left-3 px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-widest ${getCategoryClass(post.category)}`}>
                        {post.category}
                      </span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} /> {post.readTime}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            post.status === 'draft' 
                              ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' 
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}>
                            {post.status === 'draft' ? 'Rascunho' : 'Publicado'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-gray-900 dark:text-white text-sm mb-1.5 line-clamp-2 text-left group-hover:text-[#f97316] transition-colors leading-snug">
                          {post.title}
                        </h4>

                        <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2 text-left">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4">
                        <div className="flex items-center gap-2">
                          <img 
                            src={post.author.avatarUrl} 
                            alt={post.author.name} 
                            className="w-5 h-5 rounded-full border border-white/10"
                          />
                          <span className="text-[10px] font-bold text-gray-400 truncate max-w-[80px]">{post.author.name}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <ThumbsUp size={10} /> {post.likes || 0}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Eye size={10} /> {post.views || 0}
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                              <button
                                onClick={() => handleOpenEditPostModal(post)}
                                className="p-1 text-gray-500 hover:text-[#f97316] hover:bg-[#f97316]/10 rounded transition-colors cursor-pointer"
                                title="Editar Artigo"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                title="Remover Artigo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-black/10 border border-gray-200 dark:border-white/10 rounded-3xl animate-in fade-in duration-300">
                <p className="text-sm text-gray-500">Nenhum artigo dinâmico foi localizado no banco de dados.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ────────────────────────────────────────────────────────────────────────────
          MODAL 1: Cadastro / Edição de Ativos
      ──────────────────────────────────────────────────────────────────────────── */}
      {isAssetModalOpen && (
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
                onClick={() => setIsAssetModalOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Título do Ativo *</label>
                <input
                  required
                  type="text"
                  value={assetFormData.title || ''}
                  onChange={(e) => setAssetFormData({ ...assetFormData, title: e.target.value })}
                  placeholder="Ex: Guia de Abordagem Comercial"
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Categoria / Grupo *</label>
                <input
                  required
                  type="text"
                  value={assetFormData.category || ''}
                  onChange={(e) => setAssetFormData({ ...assetFormData, category: e.target.value })}
                  placeholder="Ex: Onboarding, Vendas, Suporte"
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Tipo do Ativo *</label>
                <select
                  value={assetFormData.type || 'video'}
                  onChange={(e) => setAssetFormData({ ...assetFormData, type: e.target.value as GrowthAssetType })}
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value="video" className="bg-gray-200 dark:bg-zinc-950">Vídeo (Youtube / Vimeo)</option>
                  <option value="pdf" className="bg-gray-200 dark:bg-zinc-950">PDF / Link do Drive</option>
                  <option value="script" className="bg-gray-200 dark:bg-zinc-950">Script de Vendas (Texto)</option>
                  <option value="template" className="bg-gray-200 dark:bg-zinc-950">Template / Link Geral Canva</option>
                </select>
              </div>

              {assetFormData.type !== 'script' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Link URL *</label>
                  <input
                    required
                    type="url"
                    value={assetFormData.url || ''}
                    onChange={(e) => setAssetFormData({ ...assetFormData, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              )}

              {assetFormData.type === 'script' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Texto do Script *</label>
                  <textarea
                    required
                    rows={5}
                    value={assetFormData.content || ''}
                    onChange={(e) => setAssetFormData({ ...assetFormData, content: e.target.value })}
                    placeholder="Escreva aqui a estrutura do script comercial..."
                    className="w-full px-4 py-3 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAssetSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 dark:text-white shadow-lg shadow-primary-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isAssetSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────────
          MODAL 2: Criação / Edição de Artigos (Dicas & Insights)
      ──────────────────────────────────────────────────────────────────────────── */}
      {isPostOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div 
            className="bg-gray-200 dark:bg-zinc-900 border border-gray-300 dark:border-white/10 rounded-[2.5rem] max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#f97316]/10 text-[#f97316] rounded-xl">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingPost ? 'Editar Artigo de Insight' : 'Escrever Novo Artigo'}
                </h3>
              </div>
              <button 
                onClick={() => setIsPostOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors cursor-pointer p-2 rounded-full hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar text-left">
              
              {/* Metadados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Título do Artigo *</label>
                  <input
                    required
                    type="text"
                    value={postFormData.title}
                    onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })}
                    placeholder="Ex: 5 Estratégias Práticas para Reduzir Faltas..."
                    className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Categoria *</label>
                  <select
                    value={postFormData.category}
                    onChange={(e) => setPostFormData({ ...postFormData, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs appearance-none cursor-pointer"
                  >
                    <option value="Geral" className="bg-gray-200 dark:bg-zinc-950">Geral</option>
                    <option value="Vendas" className="bg-gray-200 dark:bg-zinc-950">Vendas</option>
                    <option value="Finanças" className="bg-gray-200 dark:bg-zinc-950">Finanças</option>
                    <option value="Marketing" className="bg-gray-200 dark:bg-zinc-950">Marketing</option>
                    <option value="Gestão" className="bg-gray-200 dark:bg-zinc-950">Gestão</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Resumo Curto (Excerpt) *</label>
                <textarea
                  required
                  rows={2}
                  value={postFormData.excerpt}
                  onChange={(e) => setPostFormData({ ...postFormData, excerpt: e.target.value })}
                  placeholder="Um breve resumo de 2 linhas que aparecerá no card listagem do cliente."
                  className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo Imagem de Capa com Upload via Cloudinary */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Imagem de Capa *</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="url"
                      value={postFormData.imageUrl}
                      onChange={(e) => setPostFormData({ ...postFormData, imageUrl: e.target.value })}
                      placeholder="Cole a URL ou faça upload..."
                      className="flex-1 px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs"
                    />
                    <input
                      type="file"
                      id="post-cover-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <label
                      htmlFor="post-cover-upload"
                      className={`px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 ${
                        isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {isUploadingImage ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Upload
                    </label>
                  </div>
                  
                  {postFormData.imageUrl && (
                    <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden bg-black/30 border border-white/5 group">
                      <img 
                        src={postFormData.imageUrl} 
                        alt="Preview da Capa" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPostFormData({ ...postFormData, imageUrl: '' })}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                          title="Remover Imagem"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Tempo Estimado de Leitura *</label>
                  <input
                    required
                    type="text"
                    value={postFormData.readTime}
                    onChange={(e) => setPostFormData({ ...postFormData, readTime: e.target.value })}
                    placeholder="Ex: 4 min"
                    className="w-full px-4 py-2.5 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#f97316] outline-none text-xs"
                  />
                </div>
              </div>

              {/* Informações do Autor */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <User size={14} /> Detalhes do Autor
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Autor</label>
                    <input
                      type="text"
                      value={postFormData.authorName}
                      onChange={(e) => setPostFormData({ ...postFormData, authorName: e.target.value })}
                      placeholder="Ex: Equipe Hub Symples"
                      className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cargo / Role</label>
                    <input
                      type="text"
                      value={postFormData.authorRole}
                      onChange={(e) => setPostFormData({ ...postFormData, authorRole: e.target.value })}
                      placeholder="Ex: Consultoria Financeira"
                      className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL do Avatar</label>
                    <input
                      type="url"
                      value={postFormData.authorAvatarUrl}
                      onChange={(e) => setPostFormData({ ...postFormData, authorAvatarUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Editor de Conteúdo por Blocos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <FileText size={14} /> Blocos de Conteúdo do Artigo
                  </h4>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addBlock('paragraph')}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      + Parágrafo
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('heading')}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      + Subtítulo
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('quote')}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      + Citação
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('cta')}
                      className="px-2.5 py-1 bg-[#f97316]/10 hover:bg-[#f97316]/20 border border-[#f97316]/20 text-[#f97316] text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      + CTA (Botão)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {postFormData.blocks.map((block, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 border rounded-2xl flex gap-4 ${
                        block.type === 'cta' 
                          ? 'bg-[#f97316]/5 border-[#f97316]/15' 
                          : 'bg-black/10 border-white/5'
                      }`}
                    >
                      {/* Indicador Numérico e Ações do Bloco */}
                      <div className="flex flex-col items-center justify-between shrink-0 select-none">
                        <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-gray-400 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        
                        <div className="flex flex-col gap-1 mt-2">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveBlock(idx, 'up')}
                            className="p-1 hover:bg-white/5 disabled:opacity-20 text-gray-400 hover:text-white rounded cursor-pointer"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === postFormData.blocks.length - 1}
                            onClick={() => moveBlock(idx, 'down')}
                            className="p-1 hover:bg-white/5 disabled:opacity-20 text-gray-400 hover:text-white rounded cursor-pointer"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBlock(idx)}
                          className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded mt-2 cursor-pointer"
                          title="Remover Bloco"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Inputs do Bloco conforme tipo */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Tipo: {getFriendlyBlockType(block.type)}
                          </span>
                        </div>

                        {block.type === 'paragraph' && (
                          <textarea
                            rows={3}
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, 'text', e.target.value)}
                            placeholder="Escreva aqui o conteúdo do parágrafo..."
                            className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs resize-none"
                          />
                        )}

                        {block.type === 'heading' && (
                          <input
                            type="text"
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, 'text', e.target.value)}
                            placeholder="Título do Subtítulo..."
                            className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs font-bold"
                          />
                        )}

                        {block.type === 'quote' && (
                          <textarea
                            rows={2}
                            value={block.text || ''}
                            onChange={(e) => updateBlock(idx, 'text', e.target.value)}
                            placeholder="Citação ou frase de destaque..."
                            className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs italic"
                          />
                        )}

                        {block.type === 'cta' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 mb-1">Texto do Botão *</label>
                              <input
                                required
                                type="text"
                                value={block.ctaText || ''}
                                onChange={(e) => updateBlock(idx, 'ctaText', e.target.value)}
                                placeholder="Ex: Configurar Sinal Pix"
                                className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 mb-1">Seção Destino (Portal) *</label>
                              <select
                                value={block.ctaAction || 'home'}
                                onChange={(e) => updateBlock(idx, 'ctaAction', e.target.value)}
                                className="w-full px-3 py-2 bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#f97316] outline-none text-xs cursor-pointer appearance-none"
                              >
                                <option value="home" className="bg-gray-200 dark:bg-zinc-950">Início / Dashboard</option>
                                <option value="agenda_settings" className="bg-gray-200 dark:bg-zinc-950">Agenda (Configuração Pix)</option>
                                <option value="management" className="bg-gray-200 dark:bg-zinc-950">Meu Negócio (Calculadora/Insumos)</option>
                                <option value="finance" className="bg-gray-200 dark:bg-zinc-950">Financeiro (Faturas)</option>
                                <option value="services" className="bg-gray-200 dark:bg-zinc-950">Serviços / Projetos</option>
                                <option value="docs" className="bg-gray-200 dark:bg-zinc-950">Contratos / Assinaturas</option>
                                <option value="support" className="bg-gray-200 dark:bg-zinc-950">Suporte / Chamados</option>
                                <option value="profile" className="bg-gray-200 dark:bg-zinc-950">Minha Conta / Perfil</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status de Publicação */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Status do Artigo</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Rascunhos não aparecem no Portal Hub dos clientes.</p>
                </div>
                
                <div className="flex bg-black/30 p-1 border border-white/5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPostFormData({ ...postFormData, status: 'draft' })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      postFormData.status === 'draft'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostFormData({ ...postFormData, status: 'published' })}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      postFormData.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Publicar
                  </button>
                </div>
              </div>

              {/* Ações do Rodapé */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-white/10 mt-8">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPostSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#f97316] to-[#f97316]/80 hover:from-[#ea580c] hover:to-[#ea580c] disabled:opacity-50 text-white shadow-lg shadow-[#f97316]/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isPostSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {editingPost ? 'Atualizar Artigo' : 'Salvar e Publicar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
