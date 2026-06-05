import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, Search, Plus, Trash2, Edit3, ExternalLink, Copy, Check, X, 
  Palette, Maximize2, Info, Globe, FileText, Sparkles, User, Link as LinkIcon, AlertTriangle
} from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, 
  query, orderBy 
} from 'firebase/firestore';
import { toast } from 'sonner';

interface ProductionTemplate {
  id: string;
  title: string;
  niche: string;
  colors: string[];
  type: string;
  previewImageUrl: string;
  demoUrl?: string;
  promptTemplate: string;
  customVariables?: string[];
  createdAt: number;
  updatedAt?: number;
}

export default function ProductionTemplatesView() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { effectiveOrgId, clients } = useCRM();

  // Estados de dados
  const [templates, setTemplates] = useState<ProductionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Estados dos modais
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isPromptPanelOpen, setIsPromptPanelOpen] = useState(false);

  // Estados do template selecionado
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProductionTemplate> | null>(null);

  // Estados para geração de prompt
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [promptMode, setPromptMode] = useState<'full' | 'structural' | 'copy'>('full');
  const [copied, setCopied] = useState(false);

  // Novas variáveis customizadas temporárias (durante criação/edição no form)
  const [newVarName, setNewVarName] = useState('');

  // 1. Escuta templates do Firestore em tempo real
  useEffect(() => {
    if (!effectiveOrgId) return;

    const templatesRef = collection(db, 'organizations', effectiveOrgId, 'production_templates');
    const q = query(templatesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProductionTemplate[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ProductionTemplate);
      });
      setTemplates(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar os templates.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // Permissões
  const canManage = hasPermission('MANAGE_SETTINGS') || hasPermission('MANAGE_TEAM') || user?.email === 'jfs102019@hotmail.com';

  // Categorias disponíveis para filtro
  const categories = ['Todos', 'Landing Page', 'SaaS', 'Institucional', 'E-commerce'];

  // 2. Filtro e Busca
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'Todos' || t.type === selectedCategory;
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.colors.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // 3. CRUD: Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingTemplate({
      title: '',
      niche: '',
      type: 'Landing Page',
      colors: ['#3b82f6'],
      previewImageUrl: '',
      demoUrl: '',
      promptTemplate: '',
      customVariables: []
    });
    setIsCrudModalOpen(true);
  };

  // 4. CRUD: Abrir modal de edição
  const handleOpenEdit = (template: ProductionTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate({ ...template });
    setIsCrudModalOpen(true);
  };

  // 5. CRUD: Salvar (Criar ou Atualizar)
  const handleSaveTemplate = async () => {
    if (!effectiveOrgId || !editingTemplate) return;

    if (!editingTemplate.title || !editingTemplate.niche || !editingTemplate.promptTemplate || !editingTemplate.previewImageUrl) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const dataToSave = {
        title: editingTemplate.title,
        niche: editingTemplate.niche,
        type: editingTemplate.type || 'Landing Page',
        colors: editingTemplate.colors || ['#3b82f6'],
        previewImageUrl: editingTemplate.previewImageUrl,
        demoUrl: editingTemplate.demoUrl || '',
        promptTemplate: editingTemplate.promptTemplate,
        customVariables: editingTemplate.customVariables || [],
        updatedAt: Date.now()
      };

      if (editingTemplate.id) {
        // Atualizar
        const docRef = doc(db, 'organizations', effectiveOrgId, 'production_templates', editingTemplate.id);
        await updateDoc(docRef, dataToSave);
        toast.success("Template atualizado com sucesso!");
      } else {
        // Criar novo
        const colRef = collection(db, 'organizations', effectiveOrgId, 'production_templates');
        await addDoc(colRef, {
          ...dataToSave,
          createdAt: Date.now()
        });
        toast.success("Template criado com sucesso!");
      }

      setIsCrudModalOpen(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      toast.error("Erro ao salvar o template.");
    }
  };

  // 6. CRUD: Excluir template
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectiveOrgId) return;

    if (confirm("Tem certeza que deseja excluir permanentemente este template?")) {
      try {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'production_templates', id);
        await deleteDoc(docRef);
        toast.success("Template excluído com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir template:", err);
        toast.error("Erro ao excluir o template.");
      }
    }
  };

  // Adicionar cor ao form
  const handleAddColor = () => {
    if (editingTemplate) {
      const colors = [...(editingTemplate.colors || []), '#3b82f6'];
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  // Mudar cor específica do array
  const handleColorChange = (index: number, val: string) => {
    if (editingTemplate) {
      const colors = [...(editingTemplate.colors || [])];
      colors[index] = val;
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  // Remover cor do form
  const handleRemoveColor = (index: number) => {
    if (editingTemplate && (editingTemplate.colors || []).length > 1) {
      const colors = (editingTemplate.colors || []).filter((_, i) => i !== index);
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  // Adicionar variável customizada no form
  const handleAddCustomVariable = () => {
    if (!newVarName.trim()) return;
    // Força o formato {VARIAVEL} se não tiver chaves
    let formattedVar = newVarName.trim().toUpperCase();
    if (!formattedVar.startsWith('{')) formattedVar = `{${formattedVar}`;
    if (!formattedVar.endsWith('}')) formattedVar = `${formattedVar}}`;

    if (editingTemplate) {
      const customVariables = [...(editingTemplate.customVariables || [])];
      if (customVariables.includes(formattedVar)) {
        toast.error("Esta variável já foi adicionada!");
        return;
      }
      customVariables.push(formattedVar);
      setEditingTemplate({ ...editingTemplate, customVariables });
      setNewVarName('');
    }
  };

  // Remover variável customizada no form
  const handleRemoveCustomVariable = (variable: string) => {
    if (editingTemplate) {
      const customVariables = (editingTemplate.customVariables || []).filter(v => v !== variable);
      setEditingTemplate({ ...editingTemplate, customVariables });
    }
  };

  // 7. GERAÇÃO DE PROMPT
  const handleSelectTemplateForPrompt = (template: ProductionTemplate) => {
    setSelectedTemplate(template);
    setSelectedClientId('');
    setCustomAnswers({});
    setIsPromptPanelOpen(true);
  };

  // Auto preencher com base no cliente selecionado
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const initialAnswers: Record<string, string> = {
        '{NOME_CLIENTE}': client.name || '',
        '{WHATSAPP_CLIENTE}': client.whatsapp || '',
        '{EMAIL_CLIENTE}': client.email || '',
        '{NICHO_CLIENTE}': client.niche || '',
      };
      setCustomAnswers(prev => ({ ...prev, ...initialAnswers }));
    }
  };

  // Gerar prompt com as variáveis interpoladas
  const getGeneratedPrompt = () => {
    if (!selectedTemplate) return '';

    let prompt = selectedTemplate.promptTemplate;

    // 1. Substituir variáveis padrão
    const client = clients.find(c => c.id === selectedClientId);
    const clientName = client?.name || customAnswers['{NOME_CLIENTE}'] || 'Cliente Exemplo';
    const whatsapp = client?.whatsapp || customAnswers['{WHATSAPP_CLIENTE}'] || 'Contato do cliente';
    const email = client?.email || customAnswers['{EMAIL_CLIENTE}'] || 'E-mail do cliente';
    const niche = client?.niche || customAnswers['{NICHO_CLIENTE}'] || selectedTemplate.niche;

    prompt = prompt
      .replace(/{CLIENT_NAME}/g, clientName)
      .replace(/{NOME_CLIENTE}/g, clientName)
      .replace(/{CLIENT_WHATSAPP}/g, whatsapp)
      .replace(/{WHATSAPP_CLIENTE}/g, whatsapp)
      .replace(/{CLIENT_EMAIL}/g, email)
      .replace(/{EMAIL_CLIENTE}/g, email)
      .replace(/{CLIENT_NICHO}/g, niche)
      .replace(/{NICHO_CLIENTE}/g, niche);

    // 2. Substituir variáveis personalizadas do template
    if (selectedTemplate.customVariables) {
      selectedTemplate.customVariables.forEach(v => {
        const replacement = customAnswers[v] || `[Preencha ${v}]`;
        prompt = prompt.split(v).join(replacement); // substituição global
      });
    }

    // 3. Aplicar perfil de prompt
    if (promptMode === 'structural') {
      prompt = `Apenas foque no design visual moderno, layout de componentes responsivos e código HTML/CSS limpo usando o seguinte template como referência de dados:\n\n${prompt}`;
    } else if (promptMode === 'copy') {
      prompt = `Apenas foque no copywriting de alta conversão, redação profissional para o nicho, chamadas de ação (CTAs) estratégicas e otimização SEO com base no seguinte escopo:\n\n${prompt}`;
    }

    return prompt;
  };

  // Copiar prompt para o clipboard
  const handleCopyPrompt = () => {
    const text = getGeneratedPrompt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Prompt copiado com sucesso para a Área de Transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-primary-500" />
            Templates de Produção
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cadastre, pesquise e gerencie templates de sites. Preencha os dados de clientes para gerar prompts otimizados para IA.
          </p>
        </div>
        {canManage && (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/10"
          >
            <Plus className="w-5 h-5" />
            Novo Template
          </button>
        )}
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Barra de Busca */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all backdrop-blur-md"
            placeholder="Buscar por nome, nicho, cor ou tipo de site..."
          />
        </div>

        {/* Categorias / Pills */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap border ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-black/40 dark:bg-black/20 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* BENTO GRID DE TEMPLATES */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
          <p className="text-gray-500 text-sm font-medium tracking-wide">Carregando biblioteca de templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-black/40 dark:bg-[#111111] border border-dashed border-gray-200 dark:border-white/10 rounded-3xl text-center backdrop-blur-md">
          <div className="p-4 bg-primary-500/10 rounded-2xl mb-4 text-primary-500">
            <LayoutTemplate className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum template cadastrado</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-2">
            A biblioteca está vazia. Cadastre os modelos de site que a sua empresa produz para automatizar o fluxo do time.
          </p>
          {canManage && (
            <button 
              onClick={handleOpenCreate}
              className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02]"
            >
              Criar Primeiro Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div 
              key={template.id}
              className="group flex flex-col bg-black/40 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden hover:border-primary-500/40 shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md"
            >
              {/* Imagem de Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/20 border-b border-gray-200 dark:border-white/10">
                <img 
                  src={template.previewImageUrl} 
                  alt={template.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback visual se a imagem falhar
                    e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop";
                  }}
                />
                
                {/* Overlay de Ação Rápida de Zoom */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300">
                  <button 
                    onClick={() => { setSelectedTemplate(template); setIsPreviewModalOpen(true); }}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105"
                    title="Ampliar Imagem"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  {template.demoUrl && (
                    <a 
                      href={template.demoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105"
                      title="Ver Site Demo"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>

                {/* Badge de Categoria */}
                <span className="absolute top-4 left-4 px-3 py-1 bg-[#090d16]/80 backdrop-blur-md border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {template.type}
                </span>
              </div>

              {/* Informações */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-primary-400 transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Nicho: <span className="font-medium text-gray-700 dark:text-gray-300">{template.niche}</span>
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleOpenEdit(template, e)}
                          className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cores */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <Palette className="w-3.5 h-3.5 text-gray-400" />
                    <div className="flex gap-1">
                      {template.colors.map((color, i) => (
                        <div 
                          key={i} 
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm" 
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <button
                  onClick={() => handleSelectTemplateForPrompt(template)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-primary-500 border border-gray-200 dark:border-white/10 hover:border-primary-500 text-gray-900 dark:text-white hover:text-white rounded-xl font-bold text-xs transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar Prompt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: PREVIEW ESTENDIDO (IMAGEM E DETALHES) */}
      {isPreviewModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Header Simulado de Navegador */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-4 select-none">
                  {selectedTemplate.title} — Preview
                </span>
              </div>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Print do Site */}
            <div className="max-h-[60vh] overflow-y-auto bg-black/10">
              <img 
                src={selectedTemplate.previewImageUrl} 
                alt={selectedTemplate.title} 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop";
                }}
              />
            </div>

            {/* Rodapé de Informações */}
            <div className="p-6 bg-black/40 border-t border-gray-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{selectedTemplate.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Nicho: <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedTemplate.niche}</span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tipo: <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedTemplate.type}</span>
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                {selectedTemplate.demoUrl && (
                  <a 
                    href={selectedTemplate.demoUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Demo Real
                  </a>
                )}
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleSelectTemplateForPrompt(selectedTemplate);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-primary-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Usar Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRUD CADASTRO E EDICÃO */}
      {isCrudModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary-500" />
                {editingTemplate.id ? 'Editar Template de Site' : 'Cadastrar Novo Template'}
              </h3>
              <button 
                onClick={() => setIsCrudModalOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <div className="space-y-6 mt-6 max-h-[65vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome/Título */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Nome/Título do Site *
                  </label>
                  <input 
                    type="text" 
                    value={editingTemplate.title || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ex: Landing Page Advocacia Premium"
                    required
                  />
                </div>

                {/* Nicho */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Nicho de Mercado *
                  </label>
                  <input 
                    type="text" 
                    value={editingTemplate.niche || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, niche: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ex: Clínicas, Advocacia, Varejo"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Site */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Tipo de Estrutura
                  </label>
                  <select 
                    value={editingTemplate.type || 'Landing Page'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="Landing Page" className="bg-[#0c0d0f]">Landing Page</option>
                    <option value="SaaS" className="bg-[#0c0d0f]">SaaS / Plataforma</option>
                    <option value="Institucional" className="bg-[#0c0d0f]">Institucional</option>
                    <option value="E-commerce" className="bg-[#0c0d0f]">E-commerce</option>
                  </select>
                </div>

                {/* Cores */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                    Cores Cromáticas da Paleta
                    <button 
                      type="button" 
                      onClick={handleAddColor}
                      className="text-primary-500 text-xs font-bold hover:underline"
                    >
                      + Cor
                    </button>
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(editingTemplate.colors || []).map((color, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-black/40 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10">
                        <input 
                          type="color" 
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="w-5 h-5 border-0 bg-transparent cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="w-16 bg-transparent text-xs text-gray-300 border-0 outline-none p-0"
                        />
                        {(editingTemplate.colors || []).length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveColor(idx)}
                            className="text-red-400 hover:text-red-300 ml-1 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Links de Demo e Imagem */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Link do Print (Preview de Imagem) *
                  </label>
                  <input 
                    type="url" 
                    value={editingTemplate.previewImageUrl || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, previewImageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Cole a URL pública da imagem (ex: do Imgur ou Cloudinary)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    Link da Demo (Site Rodando)
                  </label>
                  <input 
                    type="url" 
                    value={editingTemplate.demoUrl || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, demoUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Cole a URL do template em produção (ex: Vercel, Netlify)"
                  />
                </div>
              </div>

              {/* Variáveis Customizadas */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Variáveis Dinâmicas Personalizadas (Opcional)
                </label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ex: {SLOGAN}, {DIFERENCIAL}, {SECAO_SOBRE}"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomVariable}
                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Variáveis Padrão e Criadas */}
                <div className="space-y-2.5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Variáveis Padrão Inclusas:</p>
                  <div className="flex flex-wrap gap-2 select-none">
                    {['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'].map(v => (
                      <span key={v} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs" title="Auto preenchido pelo CRM">
                        {v}
                      </span>
                    ))}
                  </div>

                  {(editingTemplate.customVariables || []).length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-3">Variáveis Customizadas do Template:</p>
                      <div className="flex flex-wrap gap-2">
                        {(editingTemplate.customVariables || []).map(v => (
                          <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-lg text-xs">
                            {v}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCustomVariable(v)}
                              className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Prompt de IA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Template do Prompt Base da IA *
                </label>
                <textarea 
                  value={editingTemplate.promptTemplate || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, promptTemplate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[150px] font-mono text-sm resize-y"
                  placeholder={`Escreva as instruções da IA. Use as tags {NOME_CLIENTE}, {WHATSAPP_CLIENTE} ou as variáveis dinâmicas que você cadastrou.\n\nEx:\nCrie um site profissional para o cliente {NOME_CLIENTE} no nicho de {NICHO_CLIENTE}.\n\nDiferencial: {DIFERENCIAL}`}
                  required
                />
              </div>
            </div>

            {/* Footer Ações */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setIsCrudModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm transition-colors border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/10"
              >
                {editingTemplate.id ? 'Salvar Alterações' : 'Criar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PAINEL DE GERAÇÃO DE PROMPT (SPLIT SCREEN) */}
      {isPromptPanelOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn my-8 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Gerador de Prompt: {selectedTemplate.title}
                </h3>
              </div>
              <button 
                onClick={() => setIsPromptPanelOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6 overflow-y-auto flex-1 pr-2">
              
              {/* Lado Esquerdo: Formulário (2/5) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Selecionar Cliente do CRM */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <label className="block text-xs font-bold text-primary-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Puxar Cliente do CRM
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="" className="bg-[#0c0d0f]">-- Selecionar Cliente Existente (Autopreencher) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0c0d0f]">{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Selecione para importar automaticamente os dados do cliente e acelerar a criação.
                  </p>
                </div>

                {/* Variáveis Normais e Customizadas */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Variáveis Dinâmicas:</h4>
                  
                  {/* Inputs Padrão */}
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Nome do Cliente / Empresa</label>
                    <input 
                      type="text"
                      value={customAnswers['{NOME_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{NOME_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                      placeholder="Ex: Dr. Silva Dental Clinic"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">WhatsApp / Telefone</label>
                    <input 
                      type="text"
                      value={customAnswers['{WHATSAPP_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{WHATSAPP_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Nicho de Negócio</label>
                    <input 
                      type="text"
                      value={customAnswers['{NICHO_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{NICHO_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                      placeholder="Ex: Odontologia Estética"
                    />
                  </div>

                  {/* Inputs Customizados do Template */}
                  {(selectedTemplate.customVariables || []).map(v => (
                    <div key={v}>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                        {v.replace(/{|}/g, '').replace(/_/g, ' ')}
                      </label>
                      <input 
                        type="text"
                        value={customAnswers[v] || ''}
                        onChange={(e) => setCustomAnswers(prev => ({ ...prev, [v]: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                        placeholder={`Preencher valor para ${v}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Alternador de Perfil de Prompt */}
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Modo do Prompt Otimizado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'full', label: 'Completo (Full)', icon: Sparkles },
                      { id: 'structural', label: 'Layout (CSS)', icon: Palette },
                      { id: 'copy', label: 'Copy / Texto', icon: FileText }
                    ].map(mode => {
                      const IconComp = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPromptMode(mode.id as any)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            promptMode === mode.id
                              ? 'bg-primary-500/15 border-primary-500 text-primary-400'
                              : 'bg-black/40 dark:bg-black/20 text-gray-400 border-gray-200 dark:border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <IconComp className="w-4 h-4 mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wide">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Lado Direito: Prompt Gerado (3/5) */}
              <div className="lg:col-span-3 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary-500" />
                    Prompt da IA Gerado:
                  </h4>
                  <span className="text-[10px] text-gray-500">Pronto para copiar e colar na IA</span>
                </div>

                {/* Visualizador de Texto (Prompt) */}
                <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto bg-black/60 border border-gray-200 dark:border-white/10 rounded-2xl p-5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed select-all">
                  {getGeneratedPrompt() || '[Aguardando preenchimento...]'}
                </div>

                {/* Ação de Copiar */}
                <button
                  onClick={handleCopyPrompt}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    copied 
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-[0.99]' 
                      : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/10 hover:scale-[1.01]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 animate-scaleUp" />
                      Copiado com Sucesso!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Prompt da IA
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Rodapé Ações */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setIsPromptPanelOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm transition-colors border border-gray-200 dark:border-white/10"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
