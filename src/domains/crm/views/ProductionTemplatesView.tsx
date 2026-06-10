import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutTemplate, Search, Plus, Trash2, Edit3, ExternalLink, Copy, Check, X, 
  Palette, Maximize2, Info, Globe, FileText, Sparkles, User, Link as LinkIcon, 
  Upload, Code, Database, ChevronRight, Eye, MousePointerClick
} from 'lucide-react';
// Imports do HeroUI removidos para evitar erros de tipo

import { EllipsisVertical, Pencil, SquarePlus, TrashBin, Heart, Bookmark } from '@gravity-ui/icons';
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
  previewImageUrl?: string; // Opcional no início
  htmlContent: string;
  customVariables?: string[];
  createdAt: number;
  updatedAt?: number;
}

// Categorias disponíveis para filtro de templates
const categories = ['Todos', 'Favoritos', 'Landing Page', 'SaaS', 'Institucional', 'E-commerce'];

// Lista estendida de sugestões de variáveis prontas e clicáveis
const SUGGESTED_VARIABLES = [
  // Cores e Estilo
  '{COR_PRIMARIA}',
  '{COR_SECUNDARIA}',
  '{COR_ACENTO}',
  
  // Textos Hero e Copy
  '{TITULO_HERO}',
  '{SUBTITULO_HERO}',
  '{SLOGAN_HERO}',
  '{CTA_TEXTO}',
  
  // Conteúdos Estruturais
  '{SECAO_SOBRE}',
  '{BENEFICIOS}',
  '{DIFERENCIAIS}',
  '{SERVICOS_LISTA}',
  '{TABELA_PRECOS}',
  '{EQUIPE_MEMBROS}',
  '{DEPOIMENTOS_CLIENTES}',
  '{FAQ_PERGUNTAS}',
  
  // Contatos e Links
  '{EMAIL_CONTATO}',
  '{TELEFONE_CONTATO}',
  '{ENDERECO_FISICO}',
  '{HORARIO_FUNCIONAMENTO}',
  '{LINK_WHATSAPP}',
  '{LINK_INSTAGRAM}',
  '{LINK_FACEBOOK}',
  
  // Mídias e Assets
  '{URL_LOGOTIPO}',
  '{URL_FAVICON}',
  '{LINK_VIDEO}',
  
  // SEO e Integrações
  '{TEXTO_RODAPE}',
  '{METATAGS_SEO}',
  '{PIXEL_FACEBOOK}'
];

export default function ProductionTemplatesView({ viewMode }: { viewMode?: 'templates' | 'prompts' }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { effectiveOrgId, clients } = useCRM();

  const canManage = hasPermission('MANAGE_LEADS') || hasPermission('MANAGE_SETTINGS');

  // Refs para manipular cursor do textarea
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptCrudTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Abas principais: 'templates' | 'prompts'
  const [localActiveTab, setLocalActiveTab] = useState<'templates' | 'prompts'>('templates');
  const activeTab = viewMode || localActiveTab;

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

  // Estados de upload/loading
  const [uploadingImage, setUploadingImage] = useState(false);

  // Entidades em edição/uso
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProductionTemplate> | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Partial<AIPrompt> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);

  // Estados para geração de prompt/demo personalizada (onde o prompt global é selecionado)
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [promptMode, setPromptMode] = useState<'full' | 'structural' | 'copy'>('full');
  const [copied, setCopied] = useState(false);

  // Novas variáveis customizadas temporárias no form
  const [newVarName, setNewVarName] = useState('');

  // Estado para armazenar templates favoritos (carregados do localStorage)
  const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm-favorite-templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteTemplate = (id: string) => {
    setFavoriteTemplates(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('crm-favorite-templates', JSON.stringify(next));
      return next;
    });
  };

  const [templatePage, setTemplatePage] = useState(1);
  const [promptPage, setPromptPage] = useState(1);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const itemsPerPage = 6;

  useEffect(() => {
    setTemplatePage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    setPromptPage(1);
  }, [searchQuery]);

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
    let matchesCategory = false;
    if (selectedCategory === 'Todos') {
      matchesCategory = true;
    } else if (selectedCategory === 'Favoritos') {
      matchesCategory = favoriteTemplates.includes(t.id);
    } else {
      matchesCategory = t.type === selectedCategory;
    }

    const matchesSearch = 
      t.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.colors.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // 4. ABERTURA DE DEMO LOCAL
  const handleOpenDemo = (htmlContent: string, answers?: Record<string, string>) => {
    if (!htmlContent) {
      toast.error("Este template não possui código HTML cadastrado!");
      return;
    }

    let finalHtml = htmlContent;

    if (answers) {
      Object.entries(answers).forEach(([key, val]) => {
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

  // 5. CRUD TEMPLATES
  const handleOpenCreateTemplate = () => {
    setEditingTemplate({
      niche: '',
      type: 'Landing Page',
      colors: ['#3b82f6'],
      previewImageUrl: '',
      htmlContent: '',
      customVariables: []
    });
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (template: ProductionTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTemplate({ ...template });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!effectiveOrgId || !editingTemplate) return;

    // A imagem de preview agora é opcional
    if (!editingTemplate.niche || !editingTemplate.htmlContent) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const dataToSave = {
        niche: editingTemplate.niche,
        type: editingTemplate.type || 'Landing Page',
        colors: editingTemplate.colors || ['#3b82f6'],
        previewImageUrl: editingTemplate.previewImageUrl || '',
        htmlContent: editingTemplate.htmlContent,
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

  const handleDeleteTemplate = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  // Upload Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      setEditingTemplate(prev => prev ? { ...prev, previewImageUrl: secureUrl } : null);
      toast.success("Print enviado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload HTML
  const handleHtmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setEditingTemplate(prev => prev ? { ...prev, htmlContent: text } : null);
      toast.success("HTML carregado!");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler HTML.");
    };
    reader.readAsText(file);
  };

  // Cores
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

  // Adicionar variável customizada de forma direta (clicável no seletor do form de template)
  const handleSelectSuggestedVariable = (variable: string) => {
    if (editingTemplate) {
      const customVariables = [...(editingTemplate.customVariables || [])];
      if (customVariables.includes(variable)) {
        toast.error("Esta variável já foi adicionada!");
        return;
      }
      customVariables.push(variable);
      setEditingTemplate({ ...editingTemplate, customVariables });
      toast.success(`Variável ${variable} adicionada!`);
    }
  };

  // Adicionar variável escrita manualmente
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

  // 6. CRUD PROMPTS
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
        toast.success("Prompt atualizado!");
      } else {
        const colRef = collection(db, 'organizations', effectiveOrgId, 'prompt_library');
        await addDoc(colRef, {
          ...dataToSave,
          createdAt: Date.now()
        });
        toast.success("Prompt cadastrado!");
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

    if (confirm("Deseja realmente excluir este prompt global?")) {
      try {
        const docRef = doc(db, 'organizations', effectiveOrgId, 'prompt_library', id);
        await deleteDoc(docRef);
        toast.success("Prompt excluído!");
      } catch (err) {
        console.error("Erro ao excluir prompt:", err);
        toast.error("Erro ao excluir.");
      }
    }
  };

  // Inserção automática de variáveis no cursor do textarea (no CRUD de prompts)
  const handleInsertVariableInCrudPrompt = (variable: string) => {
    const textarea = promptCrudTextareaRef.current;
    if (!textarea || !editingPrompt) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + variable + after;

    setEditingPrompt({ ...editingPrompt, content: newValue });

    // Foca de volta e ajusta cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 50);
  };

  // Inserção automática de variáveis no cursor do editor de HTML do template
  const handleInsertVariableInHtml = (variable: string) => {
    const textarea = htmlTextareaRef.current;
    if (!textarea || !editingTemplate) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + variable + after;

    // Se for variável customizada, ativa automaticamente na lista de customVariables do template
    const fixedCRMVariables = ['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'];
    let customVariables = [...(editingTemplate.customVariables || [])];

    if (!fixedCRMVariables.includes(variable) && !customVariables.includes(variable)) {
      customVariables.push(variable);
    }

    setEditingTemplate({
      ...editingTemplate,
      htmlContent: newValue,
      customVariables
    });

    // Foca de volta e ajusta cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 50);

    toast.success(`Variável ${variable} inserida no HTML!`);
  };

  // Inserção de variáveis no gerador de prompts (Split Screen) para customização rápida
  const handleInsertVariableInCustomPrompt = (variable: string) => {
    // Adiciona a variável ao campo de customAnswers correspondente
    if (customAnswers[variable] !== undefined) return;
    setCustomAnswers(prev => ({ ...prev, [variable]: '' }));
  };

  // 7. GERAÇÃO DE PROMPT PARA O CLIENTE (Onde seleciona o prompt global)
  const handleSelectTemplateForPrompt = (template: ProductionTemplate) => {
    setSelectedTemplate(template);
    setSelectedClientId('');
    setSelectedPromptId('');
    setCustomAnswers({});
    setIsPromptPanelOpen(true);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setCustomAnswers(prev => {
        const copy = { ...prev };
        delete copy['{NOME_CLIENTE}'];
        delete copy['{WHATSAPP_CLIENTE}'];
        delete copy['{EMAIL_CLIENTE}'];
        delete copy['{NICHO_CLIENTE}'];
        return copy;
      });
      return;
    }

    const client = clients.find(c => c.id === clientId);
    if (client) {
      setCustomAnswers(prev => ({
        ...prev,
        '{NOME_CLIENTE}': client.name || '',
        '{WHATSAPP_CLIENTE}': client.whatsapp || '',
        '{EMAIL_CLIENTE}': client.email || '',
        '{NICHO_CLIENTE}': client.niche || ''
      }));
      toast.success(`Dados de ${client.name} carregados do CRM!`);
    }
  };

  const getGeneratedPrompt = () => {
    if (!selectedTemplate) return '';

    const promptObj = prompts.find(p => p.id === selectedPromptId);
    if (!promptObj) return 'Por favor, selecione um prompt de IA no painel ao lado para gerar o conteúdo.';

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
    toast.success("Prompt copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* CABEÇALHO COM ABAS */}
      {!viewMode && (
        <div className="bg-black/40 dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-primary-500" />
              Templates de Produção
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mapeie templates White Label, teste visualizações dinâmicas locais e associe prompts da biblioteca direto no cliente.
            </p>

            <div className="flex gap-4 mt-6 border-b border-white/5 pb-1 font-bold">
              <button
                onClick={() => setLocalActiveTab('templates')}
                className={`pb-2 text-sm uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === 'templates'
                    ? 'border-primary-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                Catálogo de Templates
              </button>
              <button
                onClick={() => setLocalActiveTab('prompts')}
                className={`pb-2 text-sm uppercase tracking-wider transition-all border-b-2 ${
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
      )}

      {/* ABA 1: CATÁLOGO */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all backdrop-blur-md"
                placeholder="Filtrar por nicho, cor, tipo de site..."
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none items-center">
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

              {viewMode && canManage && (
                <button 
                  onClick={handleOpenCreateTemplate}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/10 text-xs whitespace-nowrap ml-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Template
                </button>
              )}
            </div>
          </div>

          {loadingTemplates ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
              <p className="text-gray-500 text-sm font-medium tracking-wide">Carregando catálogo...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-black/40 dark:bg-[#111111] border border-dashed border-gray-200 dark:border-white/10 rounded-3xl text-center backdrop-blur-md animate-fadeIn">
              <div className="p-4 bg-primary-500/10 rounded-2xl mb-4 text-primary-500">
                {selectedCategory === 'Favoritos' ? (
                  <Heart className="w-10 h-10 text-red-500 fill-red-500/20" />
                ) : (
                  <LayoutTemplate className="w-10 h-10" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedCategory === 'Favoritos' ? 'Nenhum favorito ainda' : 'Nenhum template cadastrado'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                {selectedCategory === 'Favoritos' 
                  ? 'Clique no ícone de coração nos templates do catálogo para adicioná-los aos seus favoritos.'
                  : 'Comece cadastrando os códigos HTML e imagens de previews dos seus sites de produção.'}
              </p>
              {canManage && selectedCategory !== 'Favoritos' && (
                <button 
                  onClick={handleOpenCreateTemplate}
                  className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
                >
                  Criar Primeiro Template
                </button>
              )}
            </div>
          ) : (<>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.slice((templatePage - 1) * itemsPerPage, templatePage * itemsPerPage).map((template) => (
                <div 
                  key={template.id}
                  className="group flex flex-col bg-black/40 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-3xl hover:border-primary-500/40 shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-md"
                >
                  {/* Print Visual com Fallback de Gradiente se não houver print */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/20 border-b border-gray-200 dark:border-white/10 rounded-t-[1.4rem]">
                    {template.previewImageUrl ? (
                      <img 
                        src={template.previewImageUrl} 
                        alt={template.niche}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-900/30 to-purple-900/20 flex flex-col items-center justify-center gap-2 select-none group-hover:scale-105 transition-transform duration-500 rounded-t-[1.4rem]">
                        <LayoutTemplate className="w-8 h-8 text-white/20" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sem Preview Cadastrado</span>
                      </div>
                    )}
                    
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300">
                      {template.previewImageUrl && (
                        <button 
                          onClick={() => { setSelectedTemplate(template); setIsPreviewModalOpen(true); }}
                          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105"
                          title="Ver Print Ampliado"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenDemo(template.htmlContent)}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-sm transition-all hover:scale-105 flex items-center gap-1.5 font-bold text-xs"
                        title="Abrir Demo Estática"
                      >
                        <Eye className="w-4 h-4" />
                        Demo
                      </button>
                    </div>

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
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              aria-label="Favoritar"
                              onClick={() => toggleFavoriteTemplate(template.id)}
                              className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                            >
                              <Heart className={`size-4 transition-colors ${favoriteTemplates.includes(template.id) ? "text-red-500 fill-red-500" : "text-gray-400"}`} />
                            </button>
                            <div className="relative">
                              <button 
                                type="button"
                                aria-label="Ações" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === template.id ? null : template.id);
                                }}
                                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                              >
                                <EllipsisVertical className="outline-none size-4" />
                              </button>
                              {activeDropdownId === template.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-xl p-2 z-20">
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ações</div>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        setActiveDropdownId(null);
                                        handleOpenEditTemplate(template, e);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg text-left"
                                    >
                                      <Pencil className="size-4 text-gray-400" />
                                      <span>Editar Template</span>
                                    </button>
                                    <div className="border-t border-white/5 my-1" />
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Zona de Perigo</div>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        setActiveDropdownId(null);
                                        handleDeleteTemplate(template.id, e);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg text-left"
                                    >
                                      <TrashBin className="size-4 text-red-500" />
                                      <span>Excluir Template</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

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
            {/* Paginação de Templates */}
            {filteredTemplates.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  type="button"
                  disabled={templatePage === 1}
                  onClick={() => setTemplatePage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white disabled:opacity-50 transition-all"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.ceil(filteredTemplates.length / itemsPerPage) }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTemplatePage(idx + 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      templatePage === idx + 1
                        ? 'bg-primary-500 border-primary-500 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={templatePage === Math.ceil(filteredTemplates.length / itemsPerPage)}
                  onClick={() => setTemplatePage(prev => Math.min(prev + 1, Math.ceil(filteredTemplates.length / itemsPerPage)))}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white disabled:opacity-50 transition-all"
                >
                  Próximo
                </button>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ABA 2: PROMPTS */}
      {activeTab === 'prompts' && (
        <div className="space-y-6">
          {viewMode && (
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <span className="text-xs text-gray-400 font-semibold tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary-500" />
                Biblioteca de Prompts Globais para Gemini/IA
              </span>
              {canManage && (
                <button 
                  onClick={handleOpenCreatePrompt}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-primary-500/10 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Novo Prompt IA
                </button>
              )}
            </div>
          )}

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
                Cadastre prompts de IA de engenharia reversa para usar nos seus clientes.
              </p>
              {canManage && (
                <button 
                  onClick={handleOpenCreatePrompt}
                  className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
                >
                  Criar Primeiro Prompt
                </button>
              )}
            </div>
          ) : (<>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prompts.slice((promptPage - 1) * itemsPerPage, promptPage * itemsPerPage).map((prompt) => (
                <div 
                  key={prompt.id}
                  className="bg-black/40 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-primary-500/30 transition-all"
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
            {/* Paginação de Prompts */}
            {prompts.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  type="button"
                  disabled={promptPage === 1}
                  onClick={() => setPromptPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white disabled:opacity-50 transition-all"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.ceil(prompts.length / itemsPerPage) }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptPage(idx + 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      promptPage === idx + 1
                        ? 'bg-primary-500 border-primary-500 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={promptPage === Math.ceil(prompts.length / itemsPerPage)}
                  onClick={() => setPromptPage(prev => Math.min(prev + 1, Math.ceil(prompts.length / itemsPerPage)))}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white disabled:opacity-50 transition-all"
                >
                  Próximo
                </button>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* MODAL: PREVIEW DE PRINT */}
      {isPreviewModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            
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

            <div className="max-h-[60vh] overflow-y-auto bg-black/10 flex justify-center">
              {selectedTemplate.previewImageUrl && (
                <img 
                  src={selectedTemplate.previewImageUrl} 
                  alt={selectedTemplate.niche} 
                  className="w-full h-auto object-contain"
                />
              )}
            </div>

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
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Abrir Demo Local
                </button>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleSelectTemplateForPrompt(selectedTemplate);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Usar para Cliente
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CRUD DE TEMPLATES (SEM O PROMPT IA OBRIGATÓRIO E PRINT OPCIONAL) */}
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
                    className="w-full px-4 py-2.5 bg-black/40 dark:bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-gray-950 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                  >
                    <option value="Landing Page" className="bg-[#0c0d0f] text-white">Landing Page</option>
                    <option value="SaaS" className="bg-[#0c0d0f] text-white">SaaS / Plataforma</option>
                    <option value="Institucional" className="bg-[#0c0d0f] text-white">Institucional</option>
                    <option value="E-commerce" className="bg-[#0c0d0f] text-white">E-commerce</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
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

              {/* UPLOADS E MÍDIAS */}
              <div className="space-y-4 border-t border-white/5 pt-4">
                {/* Upload Imagem Print (Cloudinary) */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
                      <Upload className="w-4 h-4 text-primary-500" />
                      Upload do Print do Site (Opcional)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Envie uma captura de tela do site para o Cloudinary (pode fazer isso mais tarde).
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
                        <button 
                          type="button"
                          onClick={() => setEditingTemplate(prev => prev ? { ...prev, previewImageUrl: '' } : null)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-[8px]"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Editor e Colagem de HTML */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Code className="w-4 h-4 text-primary-500" />
                      Código HTML do Site (index.html) *
                    </label>
                    <label className="text-primary-500 hover:text-primary-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Importar de Arquivo .html
                      <input 
                        type="file" 
                        accept=".html"
                        onChange={handleHtmlUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    ref={htmlTextareaRef}
                    value={editingTemplate.htmlContent || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                    className="w-full px-4 py-3 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-300 font-mono text-xs outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[200px] resize-y"
                    placeholder="Cole o código HTML/CSS/JS do site completo aqui (copiado do Gemini Canvas, por exemplo)..."
                    required
                  />

                  {/* Painel de Variáveis Clicáveis para Inserir no Cursor do HTML */}
                  <div className="mt-2 bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <MousePointerClick className="w-3.5 h-3.5 text-primary-500 animate-pulse" />
                      Clique para Inserir no Cursor do HTML (Ativa formulário automático):
                    </label>
                    <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto">
                      {/* CRM Fixas */}
                      {['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariableInHtml(v)}
                          className="px-2 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-[10px] hover:border-primary-500 hover:text-primary-400 hover:scale-105 active:scale-95 transition-all font-semibold"
                          title="Inserir variável do cliente"
                        >
                          {v}
                        </button>
                      ))}
                      {/* Customizadas sugeridas */}
                      {SUGGESTED_VARIABLES.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariableInHtml(v)}
                          className="px-2 py-1 bg-primary-500/5 border border-primary-500/20 text-primary-400 rounded-lg text-[10px] hover:bg-primary-500/10 hover:border-primary-500 hover:scale-105 active:scale-95 transition-all font-semibold"
                          title="Inserir e ativar variável no formulário"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* VARIÁVEIS CUSTOMIZADAS (Clicáveis de sugestões) */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5 text-primary-500" />
                    Variáveis Disponíveis e Sugeridas (Clique para Ativar)
                  </label>
                  <p className="text-[10px] text-gray-500 mb-3">
                    Clique nas variáveis abaixo para ativá-las no formulário dinâmico deste template.
                  </p>
                  
                  {/* Seletor Clicável */}
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto bg-black/20 p-3 rounded-2xl border border-white/5">
                    {SUGGESTED_VARIABLES.map(v => {
                      const isAlreadyActive = (editingTemplate.customVariables || []).includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleSelectSuggestedVariable(v)}
                          disabled={isAlreadyActive}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isAlreadyActive
                              ? 'bg-primary-500/5 border-primary-500/20 text-primary-500/50 cursor-not-allowed opacity-50'
                              : 'bg-black/40 border-white/5 text-gray-300 hover:border-primary-500 hover:text-primary-400 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Criação manual se necessário */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1.5 uppercase">Ou criar variável manual extra</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newVarName}
                      onChange={(e) => setNewVarName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none text-xs"
                      placeholder="Ex: {SLOGAN_HERO}"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomVariable}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-xs"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Variáveis Ativas Atuais */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Variáveis de Ficha (Auto preenchidas do CRM):</p>
                  <div className="flex flex-wrap gap-2 select-none">
                    {['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'].map(v => (
                      <span key={v} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-xs">
                        {v}
                      </span>
                    ))}
                  </div>

                  {(editingTemplate.customVariables || []).length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-3">Variáveis Customizadas Ativadas no Form:</p>
                      <div className="flex flex-wrap gap-2">
                        {(editingTemplate.customVariables || []).map(v => (
                          <span key={v} className="flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-lg text-xs">
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
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/10"
              >
                {editingTemplate.id ? 'Salvar Template' : 'Cadastrar Template'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CRUD DE PROMPTS (Inserção de variáveis clicáveis no cursor) */}
      {isPromptModalOpen && editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn">
            
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
                  ref={promptCrudTextareaRef}
                  id="prompt-textarea"
                  value={editingPrompt.content || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-300 font-mono text-xs outline-none focus:ring-2 focus:ring-primary-500/50 min-h-[220px] resize-y"
                  placeholder="Escreva seu prompt de IA aqui..."
                  required
                />
              </div>

              {/* Painel de Variáveis Clicáveis para o Prompt */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <MousePointerClick className="w-4 h-4 text-primary-500 animate-pulse" />
                  Clique nas Variáveis abaixo para inserir no Cursor:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                  {/* Ficha */}
                  {['{NOME_CLIENTE}', '{WHATSAPP_CLIENTE}', '{EMAIL_CLIENTE}', '{NICHO_CLIENTE}'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariableInCrudPrompt(v)}
                      className="px-2 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-xs hover:border-primary-500 hover:text-primary-400 hover:scale-105 active:scale-95 transition-all"
                    >
                      {v}
                    </button>
                  ))}
                  {/* Customizadas sugeridas */}
                  {SUGGESTED_VARIABLES.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariableInCrudPrompt(v)}
                      className="px-2 py-1 bg-primary-500/5 border border-primary-500/20 text-primary-400 rounded-lg text-xs hover:bg-primary-500/10 hover:border-primary-500 hover:scale-105 active:scale-95 transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrompt}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/10"
              >
                {editingPrompt.id ? 'Salvar Alterações' : 'Salvar Prompt'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PAINEL DE GERAÇÃO (SPLIT SCREEN - COM DROP DOWN DO PROMPT E DADOS DO CLIENTE) */}
      {isPromptPanelOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-fadeIn my-8 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Gerador de Prompts: Site {selectedTemplate.type} — {selectedTemplate.niche}
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
                
                {/* Selecionar Prompt da IA */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <label className="block text-xs font-bold text-primary-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Selecionar Prompt de IA *
                  </label>
                  <select 
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0c0d0f] text-gray-500">-- Selecionar Prompt da Biblioteca --</option>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0c0d0f] text-white">{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* CRM Client Dropdown */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <label className="block text-xs font-bold text-primary-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Puxar Cliente do CRM
                  </label>
                  <select 
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0c0d0f] border border-gray-200 dark:border-white/10 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0c0d0f] text-gray-500">-- Selecionar Cliente do CRM --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0c0d0f] text-white">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Variáveis Ficha */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Dados e Variáveis:</h4>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Nome da Empresa / Cliente</label>
                    <input 
                      type="text"
                      value={customAnswers['{NOME_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{NOME_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none text-xs"
                      placeholder="Ex: Consultório Dr. João"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Contato WhatsApp</label>
                    <input 
                      type="text"
                      value={customAnswers['{WHATSAPP_CLIENTE}'] || ''}
                      onChange={(e) => setCustomAnswers(prev => ({ ...prev, '{WHATSAPP_CLIENTE}': e.target.value }))}
                      className="w-full px-4 py-2 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none text-xs"
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>

                  {/* Inputs Customizados */}
                  {(selectedTemplate.customVariables || []).map(v => (
                    <div key={v}>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase flex items-center justify-between">
                        {v.replace(/{|}/g, '').replace(/_/g, ' ')}
                        {customAnswers[v] === undefined && (
                          <button 
                            type="button" 
                            onClick={() => handleInsertVariableInCustomPrompt(v)}
                            className="text-primary-500 text-[9px] font-bold hover:underline"
                          >
                            Ativar campo
                          </button>
                        )}
                      </label>
                      {customAnswers[v] !== undefined && (
                        <input 
                          type="text"
                          value={customAnswers[v] || ''}
                          onChange={(e) => setCustomAnswers(prev => ({ ...prev, [v]: e.target.value }))}
                          className="w-full px-4 py-2 bg-black/40 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none text-xs animate-scaleUp"
                          placeholder={`Preencher valor para ${v}`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Ações Demo Personalizada */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                    <Globe className="w-4 h-4 text-primary-500 animate-pulse" />
                    Preview Dinâmico do Cliente
                  </h4>
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
                  disabled={!selectedPromptId}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    !selectedPromptId 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                      : copied 
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
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-semibold text-sm border border-gray-200 dark:border-white/10"
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
