import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, Search, Plus, Trash2, Edit3, ExternalLink, Copy, Check, X, 
  Palette, Maximize2, Info, Globe, FileText, Sparkles, User, Link as LinkIcon, 
  Upload, Code, Database, ChevronRight, Eye
} from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { db } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { 
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, 
  query, orderBy 
} from 'firebase/firestore';
import { toast } from 'sonner';

interface AIPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

interface ProductionTemplate {
  id: string;
  niche: string;
  type: string;
  colors: string[];
  previewImageUrl: string;
  htmlContent: string;
  promptId: string;
  customVariables?: string[];
  createdAt: number;
  updatedAt?: number;
}

export default function ProductionTemplatesView() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { effectiveOrgId, clients } = useCRM();

  // Abas principais: 'templates' | 'prompts'
  const [activeTab, setActiveTab] = useState<'templates' | 'prompts'>('templates');

  // Estados de dados
  const [templates, setTemplates] = useState<ProductionTemplate[]>([]);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Estados dos modais
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isPromptPanelOpen, setIsPromptPanelOpen] = useState(false);

  // Estados de upload/loading nos formulários
  const [uploadingImage, setUploadingImage] = useState(false);

  // Entidades em edição/uso
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProductionTemplate> | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Partial<AIPrompt> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);

  // Estados para geração de prompt/demo personalizada
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [promptMode, setPromptMode] = useState<'full' | 'structural' | 'copy'>('full');
  const [copied, setCopied] = useState(false);

  // Novas variáveis customizadas temporárias no form
  const [newVarName, setNewVarName] = useState('');

  // Permissões
  const canManage = hasPermission('MANAGE_SETTINGS') || hasPermission('MANAGE_TEAM') || user?.email === 'jfs102019@hotmail.com';

  // Categorias disponíveis para filtro
  const categories = ['Todos', 'Landing Page', 'SaaS', 'Institucional', 'E-commerce'];

  // 1. Escuta templates do Firestore
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
      setLoadingTemplates(false);
    }, (error) => {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar os templates.");
      setLoadingTemplates(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // 2. Escuta biblioteca de prompts do Firestore
  useEffect(() => {
    if (!effectiveOrgId) return;

    const promptsRef = collection(db, 'organizations', effectiveOrgId, 'prompt_library');
    const q = query(promptsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AIPrompt[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AIPrompt);
      });
      setPrompts(list);
      setLoadingPrompts(false);
    }, (error) => {
      console.error("Erro ao carregar biblioteca de prompts:", error);
      toast.error("Erro ao carregar biblioteca de prompts.");
      setLoadingPrompts(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  // 3. Filtros e Busca de templates
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'Todos' || t.type === selectedCategory;
    const matchesSearch = 
      t.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.colors.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // 4. ABERTURA DE DEMO LOCAL EM OUTRA ABA (ESTÁTICA E DINÂMICA)
  const handleOpenDemo = (htmlContent: string, answers?: Record<string, string>) => {
    if (!htmlContent) {
      toast.error("Este template não possui código HTML cadastrado!");
      return;
    }

    let finalHtml = htmlContent;

    // Se houver respostas/variáveis fornecidas, substitui no HTML antes de injetar
    if (answers) {
      Object.entries(answers).forEach(([key, val]) => {
        // Substituição global da chave pela resposta digitada
        finalHtml = finalHtml.split(key).join(val);
      });
    }

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(finalHtml);
      newWindow.document.close();
    } else {
      toast.error("O bloqueador de pop-ups impediu a abertura da demonstração.");
    }
  };

  // 5. PROCESSOS CRUD: TEMPLATES

  const handleOpenCreateTemplate = () => {
    setEditingTemplate({
      niche: '',
      type: 'Landing Page',
      colors: ['#3b82f6'],
      previewImageUrl: '',
      htmlContent: '',
      promptId: '',
      customVariables: []
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (template: ProductionTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate({ ...template });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!effectiveOrgId || !editingTemplate) return;

    if (!editingTemplate.niche || !editingTemplate.previewImageUrl || !editingTemplate.htmlContent || !editingTemplate.promptId) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const dataToSave = {
        niche: editingTemplate.niche,
        type: editingTemplate.type || 'Landing Page',
        colors: editingTemplate.colors || ['#3b82f6'],
        previewImageUrl: editingTemplate.previewImageUrl,
        htmlContent: editingTemplate.htmlContent,
        promptId: editingTemplate.promptId,
        customVariables: editingTemplate.customVariables || [],
        updatedAt: Date.now()
      };

      if (editingTemplate.id) {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'production_templates', editingTemplate.id);
        await updateDoc(docRef, dataToSave);
        toast.success("Template atualizado com sucesso!");
      } else {
        const colRef = collection(db, 'organizations', effectiveOrgId, 'production_templates');
        await addDoc(colRef, {
          ...dataToSave,
          createdAt: Date.now()
        });
        toast.success("Template criado com sucesso!");
      }

      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      toast.error("Erro ao salvar o template.");
    }
  };

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

  // Upload do print do site para o Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      setEditingTemplate(prev => prev ? { ...prev, previewImageUrl: secureUrl } : null);
      toast.success("Print enviado ao Cloudinary com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar print para o Cloudinary.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload e leitura do arquivo HTML
  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setEditingTemplate(prev => prev ? { ...prev, htmlContent: text } : null);
      toast.success("Arquivo HTML carregado localmente com sucesso!");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo HTML.");
    };
    reader.readAsText(file);
  };

  // Manipulação de cores no form de template
  const handleAddColor = () => {
    if (editingTemplate) {
      const colors = [...(editingTemplate.colors || []), '#3b82f6'];
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  const handleColorChange = (index: number, val: string) => {
    if (editingTemplate) {
      const colors = [...(editingTemplate.colors || [])];
      colors[index] = val;
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  const handleRemoveColor = (index: number) => {
    if (editingTemplate && (editingTemplate.colors || []).length > 1) {
      const colors = (editingTemplate.colors || []).filter((_, i) => i !== index);
      setEditingTemplate({ ...editingTemplate, colors });
    }
  };

  // Variáveis customizadas no form de template
  const handleAddCustomVariable = () => {
    if (!newVarName.trim()) return;
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

  const handleRemoveCustomVariable = (variable: string) => {
    if (editingTemplate) {
      const customVariables = (editingTemplate.customVariables || []).filter(v => v !== variable);
      setEditingTemplate({ ...editingTemplate, customVariables });
    }
  };

  // 6. PROCESSOS CRUD: BIBLIOTECA DE PROMPTS

  const handleOpenCreatePrompt = () => {
    setEditingPrompt({ name: '', content: '' });
    setIsPromptModalOpen(true);
  };

  const handleOpenEditPrompt = (prompt: AIPrompt) => {
    setEditingPrompt({ ...prompt });
    setIsPromptModalOpen(true);
  };

  const handleSavePrompt = async () => {
    if (!effectiveOrgId || !editingPrompt) return;

    if (!editingPrompt.name || !editingPrompt.content) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const dataToSave = {
        name: editingPrompt.name,
        content: editingPrompt.content,
      };

      if (editingPrompt.id) {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'prompt_library', editingPrompt.id);
        await updateDoc(docRef, dataToSave);
        toast.success("Prompt atualizado com sucesso!");
      } else {
        const colRef = collection(db, 'organizations', effectiveOrgId, 'prompt_library');
        await addDoc(colRef, {
          ...dataToSave,
          createdAt: Date.now()
        });
        toast.success("Prompt cadastrado com sucesso!");
      }

      setIsPromptModalOpen(false);
      setEditingPrompt(null);
    } catch (err) {
      console.error("Erro ao salvar prompt:", err);
      toast.error("Erro ao salvar o prompt.");
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!effectiveOrgId) return;

    if (confirm("Deseja realmente excluir este prompt global? Templates que o utilizam precisarão de uma nova associação.")) {
      try {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'prompt_library', id);
        await deleteDoc(docRef);
        toast.success("Prompt excluído com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir prompt:", err);
        toast.error("Erro ao excluir o prompt.");
      }
    }
  };

  // 7. GERAÇÃO E CÓPIA DE PROMPTS
  const handleSelectTemplateForPrompt = (template: ProductionTemplate) => {
    setSelectedTemplate(template);
    setSelectedClientId('');
    setCustomAnswers({});
    setIsPromptPanelOpen(true);
  };

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

  const getGeneratedPrompt = () => {
    if (!selectedTemplate) return '';

    const promptObj = prompts.find(p => p.id === selectedTemplate.promptId);
    if (!promptObj) return 'Nenhum prompt associado a este template.';

    let prompt = promptObj.content;

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

    if (selectedTemplate.customVariables) {
      selectedTemplate.customVariables.forEach(v => {
        const replacement = customAnswers[v] || `[Preencha ${v}]`;
        prompt = prompt.split(v).join(replacement);
      });
    }

    if (promptMode === 'structural') {
      prompt = `Apenas foque no design visual moderno, layout de componentes responsivos e código HTML/CSS limpo usando o seguinte template como referência de dados:\n\n${prompt}`;
    } else if (promptMode === 'copy') {
      prompt = `Apenas foque no copywriting de alta conversão, redação profissional para o nicho, chamadas de ação (CTAs) estratégicas e otimização SEO com base no seguinte escopo:\n\n${prompt}`;
    }

    return prompt;
  };

  const handleCopyPrompt = () => {
    const text = getGeneratedPrompt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Prompt copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* CABEÇALHO COM ABAS */}
      <div className="bg-black/40 dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-primary-500" />
            Templates de Produção
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Biblioteca de site-templates White Label com renderização local de demos e injeção automática de dados do CRM.
          </p>

          {/* Abas */}
          <div className="flex gap-4 mt-6 border-b border-white/5 pb-1">
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'templates'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Catálogo de Templates
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'prompts'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Biblioteca de Prompts
            </button>
          </div>
        </div>

        <div>
          {canManage && (
            activeTab === 'templates' ? (
              <button 
                onClick={handleOpenCreateTemplate}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/10"
              >
                <Plus className="w-5 h-5" />
                Adicionar Template
              </button>
            ) : (
              <button 
                onClick={handleOpenCreatePrompt}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/10"
              >
                <Plus className="w-5 h-5" />
                Novo Prompt IA
              </button>
            )
          )}
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: CATALOGO DE TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* BUSCA E FILTROS */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all backdrop-blur-md"
                placeholder="Filtrar por nicho, cor, tipo de site..."
              />
            </div>

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

          {/* LISTAGEM GRID */}
          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
              <p className="text-gray-500 text-sm font-medium tracking-wide">Carregando catálogo...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-black/40 dark:bg-[#111111] border border-dashed border-gray-200 dark:border-white/10 rounded-3xl text-center backdrop-blur-md">
              <div className="p-4 bg-primary-500/10 rounded-2xl mb-4 text-primary-500">
                <LayoutTemplate className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum template cadastrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                Comece cadastrando os códigos HTML e imagens de previews dos seus sites de produção.
              </p>
              {canManage && (
                <button 
                  onClick={handleOpenCreateTemplate}
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
                  {/* Print Visual */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/20 border-b border-gray-200 dark:border-white/10">
                    <img 
                      src={template.previewImageUrl} 
                      alt={template.niche}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop";
                      }}
                    />
                    
                    {/* Ações Rápida Hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300">
                      <button 
                        onClick={() => { setSelectedTemplate(template); setIsPreviewModalOpen(true); }}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105"
                        title="Ver Print Ampliado"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleOpenDemo(template.htmlContent)}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105 flex items-center gap-1.5 font-bold text-xs"
                        title="Abrir Demo Estática"
                      >
                        <Eye className="w-4 h-4" />
                        Demo
                      </button>
                    </div>

                    {/* Badge Tipo */}
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
                            {template.type} — {template.niche}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Modo: <span className="font-medium text-gray-300">White Label</span>
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleOpenEditTemplate(template, e)}
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

                      {/* Paleta Cromática */}
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

                    {/* Botão de Uso */}
                    <button
                      onClick={() => handleSelectTemplateForPrompt(template)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-primary-500 border border-gray-200 dark:border-white/10 hover:border-primary-500 text-gray-900 dark:text-white hover:text-white rounded-xl font-bold text-xs transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Usar para Cliente
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: BIBLIOTECA DE PROMPTS */}
      {activeTab === 'prompts' && (
        <div className="space-y-6">
          {loadingPrompts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
              <p className="text-gray-500 text-sm font-medium tracking-wide">Carregando prompts...</p>
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-black/40 dark:bg-[#111111] border border-dashed border-gray-200 dark:border-white/10 rounded-3xl text-center backdrop-blur-md">
              <div className="p-4 bg-primary-500/10 rounded-2xl mb-4 text-primary-500">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nenhum prompt cadastrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                Cadastre prompts de engenharia reversa de IA para associar aos seus templates de site.
              </p>
              {canManage && (
                <button 
                  onClick={handleOpenCreatePrompt}
                  className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02]"
                >
                  Criar Primeiro Prompt
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  className="bg-black/40 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-500" />
                        {prompt.name}
                      </h3>
                      {canManage && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleOpenEditPrompt(prompt)}
                            className="p-1 hover:bg-white/5 text-gray-400 hover:text-white rounded transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="p-1 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Visualização curta do prompt */}
                    <div className="mt-4 bg-black/20 border border-white/5 rounded-2xl p-4 max-h-[150px] overflow-y-auto font-mono text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed select-all">
                      {prompt.content}
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 mt-4 text-right">
                    Criado em: {new Date(prompt.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: PREVIEW DE PRINT AMPLIADO */}
      {isPreviewModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            
            {/* Header Mockup */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-4 select-none">
                  Print de Visualização — {selectedTemplate.type}
                </span>
              </div>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem do print */}
            <div className="max-h-[60vh] overflow-y-auto bg-black/10 flex justify-center">
              <img 
                src={selectedTemplate.previewImageUrl} 
                alt={selectedTemplate.niche} 
                className="w-full h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop";
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-gray-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">Site {selectedTemplate.type} — {selectedTemplate.niche}</h4>
                <p className="text-xs text-gray-400">Design responsivo adaptado para criação rápida via prompt.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleOpenDemo(selectedTemplate.htmlContent);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Abrir Demo Local
                </button>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleSelectTemplateForPrompt(selectedTemplate);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-primary-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Usar para Cliente
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CRUD DE TEMPLATES (COM UPLOADS CLOUDINARY E HTML) */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn my-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary-500" />
                {editingTemplate.id ? 'Editar Template de Site' : 'Cadastrar Novo Template'}
              </h3>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mt-6 max-h-[65vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Associação do Prompt */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Prompt da IA Associado *
                  </label>
                  <select
                    value={editingTemplate.promptId || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, promptId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50"
                    required
                  >
                    <option value="" className="bg-[#0c0d0f]">-- Selecionar Prompt Global --</option>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0c0d0f]">{p.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Crie prompts na aba "Biblioteca de Prompts" para selecioná-los aqui.
                  </p>
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
                      + Adicionar Cor
                    </button>
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(editingTemplate.colors || []).map((color, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-gray-200 dark:border-white/10">
                        <input 
                          type="color" 
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="w-4 h-4 border-0 bg-transparent cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="w-16 bg-transparent text-[10px] text-gray-300 border-0 outline-none p-0"
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

              {/* UPLOADS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-4">
                {/* Upload Imagem Print (Cloudinary) */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
                      <Upload className="w-4 h-4 text-primary-500" />
                      Upload do Print (Capa/Preview) *
                    </label>
                    <p className="text-[10px] text-gray-500 mb-3">
                      Selecione a imagem do site para armazenar de forma segura no Cloudinary.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/35 border border-primary-500/40 text-primary-400 rounded-xl cursor-pointer font-bold text-xs transition-all">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Enviando...' : 'Escolher Imagem'}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    
                    {editingTemplate.previewImageUrl && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 relative">
                        <img 
                          src={editingTemplate.previewImageUrl} 
                          className="w-full h-full object-cover" 
                          alt="preview"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload index.html */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
                      <Code className="w-4 h-4 text-primary-500" />
                      Código HTML do Site (index.html) *
                    </label>
                    <p className="text-[10px] text-gray-500 mb-3">
                      Carregue o arquivo index.html contendo todo o HTML/CSS/JS do template.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/35 border border-primary-500/40 text-primary-400 rounded-xl cursor-pointer font-bold text-xs transition-all">
                      <Code className="w-4 h-4" />
                      Carregar HTML (.html)
                      <input 
                        type="file" 
                        accept=".html"
                        onChange={handleHtmlUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {editingTemplate.htmlContent ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        HTML Pronto
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">Nenhum carregado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Variáveis Customizadas */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Variáveis Customizadas de Injeção
                </label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ex: {SLOGAN_HERO}, {SECAO_SOBRE}"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomVariable}
                    className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Variáveis Padrão da Ficha do CRM:</p>
                  <div className="flex flex-wrap gap-2 select-none">
                    {['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'].map(v => (
                      <span key={v} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs">
                        {v}
                      </span>
                    ))}
                  </div>

                  {(editingTemplate.customVariables || []).length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-3">Variáveis Customizadas Ativas:</p>
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

            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm transition-colors border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/10"
              >
                {editingTemplate.id ? 'Salvar Template' : 'Cadastrar Template'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CRUD DE PROMPTS DA BIBLIOTECA */}
      {isPromptModalOpen && editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                {editingPrompt.id ? 'Editar Prompt de IA' : 'Adicionar Novo Prompt IA'}
              </h3>
              <button 
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mt-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Nome do Prompt *
                </label>
                <input 
                  type="text" 
                  value={editingPrompt.name || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Ex: Prompt Gemini Canvas Principal"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Instruções e Corpo do Prompt (Chaves de Injeção) *
                </label>
                <textarea 
                  value={editingPrompt.content || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[200px] font-mono text-sm resize-y"
                  placeholder={`Escreva seu prompt instruindo a IA. Use as variáveis para interpolação:\n\nEx:\nCrie uma landing page profissional para {NOME_CLIENTE}.\nWhatsApp de contato: {WHATSAPP_CLIENTE}.\nNicho: {NICHO_CLIENTE}.`}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm transition-colors border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrompt}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/10"
              >
                {editingPrompt.id ? 'Salvar Alterações' : 'Salvar Prompt'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PAINEL DE GERAÇÃO DE PROMPT E DEMO PERSONALIZADA (SPLIT SCREEN) */}
      {isPromptPanelOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn my-8 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Customização do Template: Site {selectedTemplate.type} — {selectedTemplate.niche}
                </h3>
              </div>
              <button 
                onClick={() => setIsPromptPanelOpen(false)}
                className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6 overflow-y-auto flex-1 pr-2">
              
              {/* Lado Esquerdo: Formulário */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* CRM Client Dropdown */}
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
                    <option value="" className="bg-[#0c0d0f]">-- Selecionar Cliente do CRM --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0c0d0f]">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Variáveis Ficha */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Preenchimento de Variáveis</h4>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Nome da Empresa / Cliente</label>
                    <input 
                      type="text"
                      value={customAnswers['{NOME_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{NOME_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                      placeholder="Ex: Consultório Dr. João"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Contato WhatsApp</label>
                    <input 
                      type="text"
                      value={customAnswers['{WHATSAPP_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{WHATSAPP_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 text-xs"
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>

                  {/* Inputs Customizados */}
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

                {/* Ações Demo Personalizada */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-4 h-4 text-primary-500" />
                    Preview Dinâmico
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    Abre o site substituindo as variáveis inseridas acima no próprio código HTML.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenDemo(selectedTemplate.htmlContent, customAnswers)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/35 text-[#3b82f6] rounded-xl font-bold text-xs transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Demo Personalizada
                  </button>
                </div>

                {/* Alternador de Perfil */}
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Modo do Prompt Otimizado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'full', label: 'Completo', icon: Sparkles },
                      { id: 'structural', label: 'Design (CSS)', icon: Palette },
                      { id: 'copy', label: 'Copy / SEO', icon: FileText }
                    ].map(mode => {
                      const IconComp = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPromptMode(mode.id as any)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            promptMode === mode.id
                              ? 'bg-primary-500/15 border-primary-500 text-primary-400'
                              : 'bg-black/40 dark:bg-black/20 text-gray-400 border-gray-200 dark:border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5 mb-1" />
                          <span className="text-[8px] font-bold uppercase tracking-wide">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Lado Direito: Prompt */}
              <div className="lg:col-span-3 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary-500" />
                    Prompt Otimizado para IA:
                  </h4>
                </div>

                <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto bg-black/60 border border-gray-200 dark:border-white/10 rounded-2xl p-5 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed select-all">
                  {getGeneratedPrompt()}
                </div>

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
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Prompt do Template
                    </>
                  )}
                </button>
              </div>

            </div>

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
