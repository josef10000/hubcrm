import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Globe, Shield, Book } from 'lucide-react';
import { WikiArticle, WikiCategory } from '@/types';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useNexusStore } from '@store/useNexusStore';
import RichTextEditor from '@shared/components/RichTextEditor';
// Componentes do HeroUI removidos para evitar erros de tipo
import { Bold, Italic, Underline } from '@gravity-ui/icons';

interface WikiEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WikiArticle | null;
}

const CATEGORIES: WikiCategory[] = ['RH', 'Vendas', 'Técnico', 'Atendimento', 'Suporte', 'Geral'];

export default function WikiEditorModal({ isOpen, onClose, initialData }: WikiEditorModalProps) {
  const { handleSaveWikiArticle, teamProfiles, orgRoles } = useCRM();
  const { userProfile } = useAuth();
  const books = useNexusStore(state => state.books);
  
  const editorRef = React.useRef<any>(null);
  
  const [formData, setFormData] = useState<Partial<WikiArticle>>({
    title: '',
    content: '',
    categories: ['Geral'],
    allowedRoles: [],
    allowedUserIds: [],
    isPopular: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        content: '',
        categories: ['Geral'],
        allowedRoles: [],
        allowedUserIds: [],
        isPopular: false
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capturar o conteúdo atualizado diretamente do editor (DOM) para evitar race conditions
    const currentContent = editorRef.current?.getContent() || formData.content;
    
    if (!formData.title || !currentContent) return;

    await handleSaveWikiArticle({
      ...formData,
      content: currentContent,
      authorId: userProfile?.uid || '',
      authorName: userProfile?.displayName || 'Desconhecido'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-gray-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/20 rounded-2xl">
              <Shield className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialData ? 'Editar Artigo' : 'Novo Artigo na Wiki'}
              </h2>
              <p className="text-sm text-gray-400">Crie conhecimento compartilhado para a equipe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Título do Artigo</label>
                  <input
                    required
                    type="text"
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Guia de Onboarding para Novos SDRs"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-lg font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-sm font-medium text-gray-400">Conteúdo do Artigo</label>
                <div className="bg-white/5 border border-white/10 rounded-t-xl px-2 py-1 flex gap-1 items-center">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Negrito" className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-all">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Itálico" className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-all">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="Sublinhado" className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-all">
                      <Underline className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
                  <RichTextEditor
                    ref={editorRef}
                    value={formData.content || ''}
                    onChange={val => setFormData({ ...formData, content: val })}
                    placeholder="Escreva o conteúdo detalhado aqui..."
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Config */}
            <div className="space-y-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Configurações Gerais
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-widest">Temas do Artigo</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={formData.categories?.includes(cat) || false}
                          onChange={e => {
                            const current = formData.categories || [];
                            setFormData({
                              ...formData,
                              categories: e.target.checked 
                                ? [...current, cat]
                                : current.filter(c => c !== cat)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                        />
                        <span className="text-xs font-medium text-gray-300">{cat}</span>
                      </label>
                    ))}
                  </div>
                  {(!formData.categories || formData.categories.length === 0) && (
                    <p className="mt-2 text-[10px] text-orange-500/70 italic flex items-center gap-1">
                      ⚠️ Selecione pelo menos um tema.
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.isPopular || false}
                    onChange={e => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                  />
                  <div>
                    <span className="text-sm font-medium text-white block">Destaque</span>
                    <span className="text-xs text-gray-500">Exibir na seção de populares</span>
                  </div>
                </label>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Book className="w-4 h-4" /> Nexus Library
                </h3>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">Vincular Livro</label>
                  <select
                    value={formData.relatedBookId || ''}
                    onChange={(e) => setFormData({ ...formData, relatedBookId: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0c0d0f] text-white">Nenhum livro vinculado</option>
                    {books.map(book => (
                      <option key={book.id} value={book.id} className="bg-[#0c0d0f] text-white">{book.title}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-[10px] text-gray-500 italic font-medium">Exibirá a capa do livro no artigo.</p>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Controle de Acesso
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Por Cargos</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                    {orgRoles.map(role => (
                      <label key={role.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:bg-white/5 p-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.allowedRoles?.some(r => (typeof r === 'string' ? r : r.id) === role.id) || false}
                          onChange={e => {
                            const roles = formData.allowedRoles || [];
                            setFormData({
                              ...formData,
                              allowedRoles: e.target.checked 
                                ? [...roles, role]
                                : roles.filter(r => (typeof r === 'string' ? r : r.id) !== role.id)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Por Usuários Específicos</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                    {teamProfiles.map(profile => (
                      <label key={profile.uid} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:bg-white/5 p-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.allowedUserIds?.includes(profile.uid) || false}
                          onChange={e => {
                            const users = formData.allowedUserIds || [];
                            setFormData({
                              ...formData,
                              allowedUserIds: e.target.checked 
                                ? [...users, profile.uid]
                                : users.filter(id => id !== profile.uid)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/50"
                        />
                        <span>{profile.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <p className="text-[10px] text-gray-500 italic">
                  * Se nenhum for selecionado, o artigo será visível para todos.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/5">
          <button
            onClick={onClose}
            type="button"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-white rounded-2xl transition-all font-semibold shadow-xl shadow-primary-500/20 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Salvar Artigo
          </button>
        </div>
      </div>
    </div>
  );
}
